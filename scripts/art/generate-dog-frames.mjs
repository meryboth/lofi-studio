// Animation frames for the 2D dog: img2img variations of the chosen sprites through the local ComfyUI API.
//
//   node scripts/art/generate-dog-frames.mjs              every frame, every seed
//   node scripts/art/generate-dog-frames.mjs --only rest  frames whose id starts with "rest"
//
// Frames with a `mask` are inpainted (only that ellipse changes, so frames swap without flicker); needs ffmpeg.
// Needs art/raw/dog/<base>.png from generate-dog.mjs. Writes art/raw/dog/frames/<id>-<seed>(.png|-cut.png).
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const COMFY = process.env.COMFY_URL ?? "http://127.0.0.1:8000";
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : "";

const workflow = JSON.parse(await readFile(join(root, "art/workflows/anima-sprite.api.json"), "utf8"));
const { style, dog } = JSON.parse(await readFile(join(root, "art/dog-poses.json"), "utf8"));
const { frames } = JSON.parse(await readFile(join(root, "art/dog-frames.json"), "utf8"));
const outDir = join(root, "art/raw/dog/frames");
const exists = path => access(path).then(() => true, () => false);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const uploaded = new Map();

// Feathered white ellipse on black, 1024², for LoadImageMask.
// A fifth value turns it into a ring: the inner ellipse (that fraction of the size) is left untouched.
function ellipseMask(id, [cx, cy, rx, ry, inner = 0]) {
  mkdirSync(join(root, "art/raw/dog/masks"), { recursive: true });
  const target = join(root, `art/raw/dog/masks/${id}.png`);
  const d = `(pow((X-${cx})/${rx},2)+pow((Y-${cy})/${ry},2))`;
  const lum = `255*lt(${d},1)*gte(${d},${inner * inner})`;
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=black:s=1024x1024:d=1", "-frames:v", "1", "-vf", `format=gray,geq=lum='${lum}',gblur=sigma=${Math.max(3, Math.min(14, Math.min(rx, ry) / 4))}`, target]);
  return target;
}

async function upload(path, name) {
  if (uploaded.has(name)) return uploaded.get(name);
  const form = new FormData();
  form.append("image", new Blob([await readFile(path)], { type: "image/png" }), name);
  form.append("overwrite", "true");
  const response = await fetch(`${COMFY}/upload/image`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`upload failed for ${name}: ${response.status}`);
  const stored = (await response.json()).name;
  uploaded.set(name, stored);
  return stored;
}

async function fetchImage(file, target) {
  const url = `${COMFY}/view?${new URLSearchParams({ filename: file.filename, subfolder: file.subfolder, type: file.type })}`;
  await writeFile(target, Buffer.from(await (await fetch(url)).arrayBuffer()));
}

async function run(frame, seed) {
  const base = join(outDir, `${frame.id}-${seed}`);
  if (await exists(`${base}-cut.png`)) return console.log(`skip  ${frame.id} seed ${seed}`);
  const prompt = structuredClone(workflow);
  prompt["20"] = { class_type: "LoadImage", inputs: { image: await upload(join(root, `art/raw/dog/${frame.base}.png`), `lofi-dog-${frame.base.replace("/", "-")}.png`) } };
  prompt["21"] = { class_type: "VAEEncode", inputs: { pixels: ["20", 0], vae: ["4", 0] } };
  delete prompt["7"];
  prompt["8"].inputs.latent_image = ["21", 0];
  if (frame.mask) {
    // Inpaint only inside the mask, then paste the result back over the untouched base.
    const mask = await upload(ellipseMask(frame.id, frame.mask), `lofi-dog-mask-${frame.id}.png`);
    prompt["22"] = { class_type: "LoadImageMask", inputs: { image: mask, channel: "red" } };
    prompt["23"] = { class_type: "SetLatentNoiseMask", inputs: { samples: ["21", 0], mask: ["22", 0] } };
    prompt["24"] = { class_type: "ImageCompositeMasked", inputs: { destination: ["20", 0], source: ["9", 0], x: 0, y: 0, resize_source: false, mask: ["22", 0] } };
    prompt["8"].inputs.latent_image = ["23", 0];
    prompt["10"].inputs.images = ["24", 0];
    prompt["11"].inputs.image = ["24", 0];
  }
  prompt["8"].inputs.denoise = frame.denoise;
  prompt["8"].inputs.seed = seed;
  prompt["5"].inputs.text = `${style}. ${dog}, ${frame.prompt}.`;
  prompt["10"].inputs.filename_prefix = `lofi-dog/frames/${frame.id}-${seed}`;
  prompt["12"].inputs.filename_prefix = `lofi-dog/frames/${frame.id}-${seed}-cut`;

  const started = Date.now();
  const queued = await fetch(`${COMFY}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, client_id: "lofi-dog" }) });
  const body = await queued.json();
  if (!queued.ok) throw new Error(`ComfyUI rejected ${frame.id}: ${JSON.stringify(body.node_errors ?? body.error ?? body)}`);
  for (;;) {
    await sleep(2000);
    const entry = (await (await fetch(`${COMFY}/history/${body.prompt_id}`)).json())[body.prompt_id];
    if (!entry) continue;
    if (entry.status?.status_str === "error") throw new Error(`generation failed for ${frame.id}: ${JSON.stringify(entry.status.messages?.at(-1))}`);
    const raw = entry.outputs?.["10"]?.images?.[0], cut = entry.outputs?.["12"]?.images?.[0];
    if (!raw || !cut) continue;
    await mkdir(outDir, { recursive: true });
    await fetchImage(raw, `${base}.png`);
    await fetchImage(cut, `${base}-cut.png`);
    return console.log(`done  ${frame.id} seed ${seed} in ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
}

for (const frame of frames.filter(f => f.id.startsWith(only))) for (const seed of frame.seeds) await run(frame, seed);
