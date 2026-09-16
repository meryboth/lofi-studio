// 2D dog sprites through the local ComfyUI API (Anima + RMBG background removal).
//
//   node scripts/art/generate-dog.mjs              every pose, every seed
//   node scripts/art/generate-dog.mjs --only rest  poses whose id starts with "rest"
//
// Writes art/raw/dog/<pose>-<seed>.png (as generated) and <pose>-<seed>-cut.png (transparent); existing files are skipped.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const COMFY = process.env.COMFY_URL ?? "http://127.0.0.1:8000";
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : "";

const workflow = JSON.parse(await readFile(join(root, "art/workflows/anima-sprite.api.json"), "utf8"));
const { style, dog, poses } = JSON.parse(await readFile(join(root, "art/dog-poses.json"), "utf8"));
const outDir = join(root, "art/raw/dog");
const exists = path => access(path).then(() => true, () => false);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchImage(file, target) {
  const url = `${COMFY}/view?${new URLSearchParams({ filename: file.filename, subfolder: file.subfolder, type: file.type })}`;
  await writeFile(target, Buffer.from(await (await fetch(url)).arrayBuffer()));
}

async function run(pose, seed) {
  const base = join(outDir, `${pose.id}-${seed}`);
  if (await exists(`${base}-cut.png`)) return console.log(`skip  ${pose.id} seed ${seed}`);
  const prompt = structuredClone(workflow);
  prompt["5"].inputs.text = `${style}. ${dog}, ${pose.prompt}.`;
  prompt["8"].inputs.seed = seed;
  prompt["10"].inputs.filename_prefix = `lofi-dog/${pose.id}-${seed}`;
  prompt["12"].inputs.filename_prefix = `lofi-dog/${pose.id}-${seed}-cut`;

  const started = Date.now();
  const queued = await fetch(`${COMFY}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, client_id: "lofi-dog" }) });
  const body = await queued.json();
  if (!queued.ok) throw new Error(`ComfyUI rejected ${pose.id}: ${JSON.stringify(body.node_errors ?? body.error ?? body)}`);
  for (;;) {
    await sleep(2000);
    const entry = (await (await fetch(`${COMFY}/history/${body.prompt_id}`)).json())[body.prompt_id];
    if (!entry) continue;
    if (entry.status?.status_str === "error") throw new Error(`generation failed for ${pose.id}: ${JSON.stringify(entry.status.messages?.at(-1))}`);
    const raw = entry.outputs?.["10"]?.images?.[0], cut = entry.outputs?.["12"]?.images?.[0];
    if (!raw || !cut) continue;
    await mkdir(outDir, { recursive: true });
    await fetchImage(raw, `${base}.png`);
    await fetchImage(cut, `${base}-cut.png`);
    return console.log(`done  ${pose.id} seed ${seed} in ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
}

for (const pose of poses.filter(p => p.id.startsWith(only))) for (const seed of pose.seeds) await run(pose, seed);
