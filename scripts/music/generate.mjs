// Batch music generation through the local ComfyUI API (see MUSIC-PIPELINE.md, stage 2).
//
//   node scripts/music/generate.mjs                       all tracks, every seed
//   node scripts/music/generate.mjs --only smoke          tracks whose id starts with "smoke"
//   node scripts/music/generate.mjs --only solar --dry    print the patched prompts without queuing
//
// Results land in music/raw/<track id>-<seed>.flac; existing files are skipped so runs can resume.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const COMFY = process.env.COMFY_URL ?? "http://127.0.0.1:8000";
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : "";
const dry = args.includes("--dry");

const workflow = JSON.parse(await readFile(join(root, "music/workflows/ace15-lofi.api.json"), "utf8"));
const { suffix, tracks } = JSON.parse(await readFile(join(root, "music/tracks.json"), "utf8"));
const exists = path => access(path).then(() => true, () => false);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function patch(track, seed) {
  const prompt = structuredClone(workflow);
  Object.assign(prompt["94"].inputs, { tags: `${track.tags}, ${suffix}`, seed, bpm: track.bpm, duration: track.duration, keyscale: track.keyscale });
  prompt["98"].inputs.seconds = track.duration;
  prompt["3"].inputs.seed = seed;
  prompt["104"].inputs.filename_prefix = `surco/${track.id}-${seed}`;
  return prompt;
}

async function run(track, seed) {
  const target = join(root, "music/raw", `${track.id}-${seed}.flac`);
  if (await exists(target)) return console.log(`skip  ${track.id} seed ${seed} (already generated)`);
  const prompt = patch(track, seed);
  if (dry) return console.log(JSON.stringify(prompt["94"].inputs, null, 2));

  const started = Date.now();
  const queued = await fetch(`${COMFY}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, client_id: "surco-music" }) });
  const body = await queued.json();
  if (!queued.ok) throw new Error(`ComfyUI rejected ${track.id}: ${JSON.stringify(body.node_errors ?? body.error ?? body)}`);
  console.log(`queue ${track.id} seed ${seed} → ${body.prompt_id}`);

  for (;;) {
    await sleep(3000);
    const history = await (await fetch(`${COMFY}/history/${body.prompt_id}`)).json();
    const entry = history[body.prompt_id];
    if (!entry) continue;
    if (entry.status?.status_str === "error") throw new Error(`generation failed for ${track.id}: ${JSON.stringify(entry.status.messages?.at(-1))}`);
    const file = entry.outputs?.["104"]?.audio?.[0];
    if (!file) continue;
    const url = `${COMFY}/view?${new URLSearchParams({ filename: file.filename, subfolder: file.subfolder, type: file.type })}`;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await (await fetch(url)).arrayBuffer()));
    const seconds = (Date.now() - started) / 1000;
    console.log(`done  ${track.id} seed ${seed} in ${seconds.toFixed(0)} s (${(seconds / track.duration).toFixed(1)}× real time) → ${target}`);
    return;
  }
}

for (const track of tracks.filter(t => t.id.startsWith(only))) {
  for (const seed of track.seeds) await run(track, seed);
}
