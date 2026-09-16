"use client";

import { useEffect, useRef, useState } from "react";
import { Disc3 } from "lucide-react";

import { records } from "./records";
import { idleMood, moods } from "./moods";
import Loft, { type LoftApi } from "./loft";
import Dock, { type Song, type StreamStatus } from "./dock";
import Fullscreen from "./fullscreen";
// A deterministic, original 48-second ambient study, rendered locally once. Used only when the radio stream is unreachable.
function compose(context: AudioContext, variant=0) {
  const rate = context.sampleRate, seconds = 48;
  const buffer = context.createBuffer(2, rate * seconds, rate);
  const chords = [[110, 164.81, 220, 261.63], [87.31, 130.81, 174.61, 220], [130.81, 196, 261.63, 329.63], [98, 146.83, 196, 246.94]];
  for (let channel = 0; channel < 2; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let i = 0; i < samples.length; i++) {
      const t = i / rate, section = Math.floor(t / 12), local = t % 12;
      const chord = chords[section];
      const envelope = Math.min(local / 2, 1, (12 - local) / 2);
      let value = 0;
      chord.forEach((hz, n) => {
        const phase = t * hz * [1,.89,.75,1.12,.94,.84][variant] * Math.PI * 2 + channel * .07;
        value += (Math.sin(phase) + .17 * Math.sin(phase * 2 + Math.sin(t * .3))) * .032 * envelope * (1 + .15 * Math.sin(t * .6 + n));
      });
      const beatLength=[.75,.86,1,.8,.92,.7][variant];
      const beat = t % beatLength;
      value += Math.sin(2 * Math.PI * (48 * beat + 3 * (1 - Math.exp(-beat * 30)))) * Math.exp(-beat * 13) * .12;
      const noteIndex = Math.floor(t / (beatLength/2));
      const note = chord[noteIndex % 4] * (noteIndex % 3 === 0 ? 4 : 2);
      const pluck = t % (beatLength/2);
      value += Math.sin(2 * Math.PI * note * t + channel * .2) * Math.exp(-pluck * 10) * .04;
      value += Math.sin(t*(.7+variant*.13)+channel)*.008 + Math.sin(t*39.1)*Math.sin(t*91.7+variant)*.006;
      samples[i] = Math.tanh(value) * Math.min(t / 2, 1, (seconds - t) / 3);
    }
  }
  return buffer;
}

const vertex = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision mediump float;
uniform vec2 resolution; uniform float time; uniform float bass; uniform float treble; uniform float environment; uniform vec2 pointer;
void main(){
 vec2 p=(gl_FragCoord.xy*2.-resolution)/min(resolution.x,resolution.y);
 p += pointer*.045; float r=length(p), a=atan(p.y,p.x);
 float radius=.49+bass*.025;
 float turbulence=sin(a*9.+time*.22)*.008+sin(a*23.-time*.35)*.004+sin(a*51.+time*.4)*.002;
 float edge=abs(r-radius-turbulence*(1.+treble));
 float corona=.007/(edge+.006);
 float flare=pow(max(0.,sin(a*3.+time*.12)+sin(a*7.-time*.07)*.4),3.);
 float haze=exp(-abs(r-radius)*9.)*(.18+flare*.09+bass*.12);
 vec3 amber=vec3(1.,.31,.055), gold=vec3(1.,.77,.38);
 vec3 color=amber*(corona*.38+haze)+gold*pow(corona,2.)*.4;
 float grooves=pow(.5+.5*sin(r*230.-time*.7+sin(a*6.+time*.2)*2.),10.);
 color+=amber*grooves*.035*smoothstep(radius,radius+.06,r)*exp(-r*.8);
 color*=smoothstep(radius-.012,radius+.004,r);
 float star=pow(max(0.,1.-length(p-vec2(cos(time*.06),sin(time*.06))*radius)*7.),6.);
 color+=gold*star*.9;
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
 color+=vec3(grain*.017);
 if(environment>0.5 && environment<1.5){
   color=vec3(.015,.035,.065);
   for(int i=0;i<12;i++){
     float f=float(i);
     float wave=-.6+f*.105+sin(p.x*1.4+time*.16+f*.38)*.1+sin(p.x*3.-time*.1+f)*.025;
     float line=exp(-abs(p.y-wave)*100.);
     color+=vec3(.08,.31,.4)*line*(.16+f*.035+bass*.1);
   }
   float moon=length(p-vec2(.4,.48));
   color+=vec3(.55,.7,.75)*smoothstep(.105,.098,moon);
   color+=vec3(.08,.16,.23)*exp(-moon*5.);
 } else if(environment>1.5){
   color=vec3(.013,.033,.026);
   for(int i=0;i<18;i++){
     float f=float(i);
     float x=sin(f*17.1)*2.1;
     float trunk=abs(p.x-x-sin(p.y*.9+time*.07+f)*.025);
     color+=vec3(.08,.16,.08)*exp(-trunk*(35.+f*3.))*(.4+p.y*.15);
     vec2 light=vec2(sin(f*13.7+time*.03)*1.6,cos(f*7.3+time*.05)*.9);
     color+=vec3(.5,.7,.18)*exp(-length(p-light)*190.)*(.5+.5*sin(time*.6+f));
   }
   color+=vec3(.1,.19,.08)*exp(-length(p-vec2(.2,.6))*2.)*.4;
 }
 float stars=pow(fract(sin(dot(floor(gl_FragCoord.xy/3.),vec2(12.9898,78.233)))*43758.5453),220.)*.35;
 if(environment<.5) color+=vec3(stars)*smoothstep(.65,1.4,r);
 gl_FragColor=vec4(color+vec3(.014,.009,.008),1.);
}`;

const streamUrl = (station: string) => `https://ice1.somafm.com/${station}-128-mp3`;
// One media element streams the record's SomaFM channel into the analyser; `synth` is the local fallback loop.
type Playback = { context: AudioContext; analyser: AnalyserNode; gain: GainNode; element: HTMLAudioElement; synth?: AudioBufferSourceNode; station: number; mode: "stream" | "synth"; playing: boolean };

export default function Solar() {
  const [showDiscs, setShowDiscs] = useState(true);
  const spectrum = useRef(new Uint8Array(256));
  const pulse = useRef({ avg: 0, beat: 0, last: 0, at: 0 });
  const roomVisible = useRef(true);
  roomVisible.current = showDiscs;
  const [environment, setEnvironment] = useState(0);
  const environmentRef = useRef(0);
  const [begun, setBegun] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(0);
  const recordRef = useRef(0);
  const loftApi = useRef<LoftApi | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<Playback | null>(null);
  const synthCache = useRef(new Map<number, AudioBuffer>());
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [song, setSong] = useState<Song | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [volume, setVolume] = useState(.6);
  const [muted, setMuted] = useState(false);
  const level = useRef(.6);
  level.current = muted ? 0 : volume;
  const [error, setError] = useState("");
  const [visualFallback, setVisualFallback] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem("surco.volume"); if (saved !== null && Number(saved) >= 0 && Number(saved) <= 1) setVolume(Number(saved)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("surco.volume", String(volume)); } catch {}
    const a = audio.current; if (a?.playing) a.gain.gain.setTargetAtTime(muted ? 0 : volume, a.context.currentTime, .04);
  }, [volume, muted]);

  // Created inside the first click on a sleeve so the browser allows sound. Gain starts at zero: the stream buffers silently
  // while the disc travels to the platter and fades in when the tonearm drops.
  function ensureAudio() {
    if (audio.current) return audio.current;
    const context = new AudioContext();
    const analyser = context.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = .86;
    const gain = context.createGain(); gain.gain.value = 0;
    analyser.connect(gain); gain.connect(context.destination);
    const element = new Audio(); element.crossOrigin = "anonymous"; element.preload = "none";
    context.createMediaElementSource(element).connect(analyser);
    const a: Playback = { context, analyser, gain, element, station: 0, mode: "stream", playing: false };
    element.addEventListener("playing", () => { if (a.mode === "stream") setStatus("live"); });
    element.addEventListener("waiting", () => { if (a.mode === "stream" && element.getAttribute("src")) setStatus("connecting"); });
    element.addEventListener("error", () => { if (a.mode === "stream" && element.getAttribute("src")) fallback(a); });
    return audio.current = a;
  }
  const fade = (a: Playback, value: number, seconds: number) => a.gain.gain.setTargetAtTime(value, a.context.currentTime, seconds);
  function release(a: Playback) { a.element.pause(); a.element.removeAttribute("src"); a.element.load(); }
  function stopSynth(a: Playback) { if (a.synth) { a.synth.stop(); a.synth.disconnect(); a.synth = undefined; } }
  function startSynth(a: Playback) {
    stopSynth(a);
    let buffer = synthCache.current.get(a.station);
    if (!buffer) { buffer = compose(a.context, a.station); synthCache.current.set(a.station, buffer); }
    const source = a.context.createBufferSource(); source.buffer = buffer; source.loop = true; source.connect(a.analyser); source.start(); a.synth = source;
  }
  // Stream unreachable (offline, blocked, channel down): keep the room alive with the local loop.
  function fallback(a: Playback) {
    if (a.mode === "synth") return;
    a.mode = "synth"; release(a); setStatus("offline"); setSong(null);
    if (a.playing) startSynth(a);
  }
  // Tuning always joins the live edge; pausing a radio and resuming later should not replay stale buffer.
  function tune(a: Playback, index: number) {
    stopSynth(a); a.mode = "stream"; a.station = index;
    a.element.src = streamUrl(records[index].station.id);
    setStatus("connecting");
    a.element.play().catch((err: DOMException) => { if (err.name !== "AbortError") fallback(a); });
  }
  function prepare(index = 0) {
    try {
      const a = ensureAudio(); void a.context.resume();
      a.playing = false; setPlaying(false); setSong(null); fade(a, 0, .08);
      tune(a, index);
    } catch { setError("Activá el sonido para comenzar."); }
  }
  function begin(index: number) {
    setCurrentRecord(index); recordRef.current = index; const world = index === 3 ? 2 : index === 1 ? 1 : 0; setEnvironment(world); environmentRef.current = world; setBegun(true);
    const a = audio.current ?? ensureAudio();
    a.playing = true; setPlaying(true);
    if (a.mode === "synth") startSynth(a); else if (a.element.paused) tune(a, index);
    fade(a, level.current, .6);
  }
  async function toggle() {
    setBegun(true);
    try {
      const a = ensureAudio(); await a.context.resume();
      if (a.playing) {
        a.playing = false; setPlaying(false); fade(a, 0, .08);
        window.setTimeout(() => { if (a.playing) return; if (a.mode === "stream") { release(a); setStatus("idle"); } else stopSynth(a); }, 350);
      } else {
        a.playing = true; setPlaying(true);
        tune(a, a.station);
        fade(a, level.current, .25);
      }
    } catch { setError("El audio no pudo iniciarse. Intentá reproducir nuevamente."); }
  }
  const skip = (step: number) => { if (!busyRef.current) loftApi.current?.select((recordRef.current + step + records.length) % records.length); };

  // What the channel is playing right now (SomaFM publishes it as JSON with open CORS).
  useEffect(() => {
    if (!playing || status !== "live") return;
    const id = records[currentRecord].station.id;
    let alive = true;
    const load = () => fetch(`https://somafm.com/songs/${id}.json`).then(r => r.json()).then(j => { const s = j.songs?.[0]; if (alive && s) setSong({ title: s.title, artist: s.artist }); }).catch(() => {});
    void load();
    const timer = window.setInterval(load, 30e3);
    return () => { alive = false; clearInterval(timer); };
  }, [playing, status, currentRecord]);

  // Called by the loft every frame: band energies plus a decaying beat envelope from bass onsets over a running average.
  const getAudio = () => {
    const a = audio.current, p = pulse.current, now = performance.now();
    let bass = 0, high = 0;
    p.beat *= Math.exp(-Math.min(now - p.at, 100) / 1000 * 6);
    if (a?.playing) {
      a.analyser.getByteFrequencyData(spectrum.current);
      for (let i = 1; i < 9; i++) bass += spectrum.current[i] / (8 * 255);
      for (let i = 15; i < 75; i++) high += spectrum.current[i] / (60 * 255);
      p.avg += (bass - p.avg) * Math.min(1, (now - p.at) / 1000 * 1.5);
      if (bass > p.avg * 1.22 + .03 && now - p.last > 240) { p.beat = 1; p.last = now; }
    }
    p.at = now;
    return { bass, high, beat: p.beat, playing: !!a?.playing, record: recordRef.current };
  };

  const actions = useRef({ toggle, skip, mute: () => setMuted(m => !m) });
  actions.current = { toggle, skip, mute: () => setMuted(m => !m) };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!audio.current || (e.target as HTMLElement).closest?.("input, textarea, select, button, a, [contenteditable]")) return;
      if (e.code === "Space") { e.preventDefault(); void actions.current.toggle(); }
      else if (e.key === "ArrowRight") actions.current.skip(1);
      else if (e.key === "ArrowLeft") actions.current.skip(-1);
      else if (e.key.toLowerCase() === "m") actions.current.mute();
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); const a = audio.current; if (a) { stopSynth(a); release(a); void a.context.close(); } audio.current = null; };
  }, []);

  // System media controls (keyboard media keys, lock screen, OS overlays).
  useEffect(() => {
    if (!begun || !("mediaSession" in navigator)) return;
    const r = records[currentRecord];
    navigator.mediaSession.metadata = new MediaMetadata({ title: song?.title ?? r.title, artist: song?.artist ?? `SomaFM ${r.station.name}`, album: r.title });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    const set = (action: MediaSessionAction, fn: () => void) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch {} };
    set("play", () => void actions.current.toggle()); set("pause", () => void actions.current.toggle());
    set("nexttrack", () => actions.current.skip(1)); set("previoustrack", () => actions.current.skip(-1));
  }, [begun, currentRecord, playing, song]);

  useEffect(() => {
    const element = canvas.current!;
    const gl = element.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) { setVisualFallback(true); return; }
    const shaders: WebGLShader[] = [];
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!; shaders.push(s); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("Shader unavailable");
      return s;
    };
    const program = gl.createProgram()!;
    try { gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Program unavailable"); }
    catch { setVisualFallback(true); shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); return; }
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program,"position"); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
    const uniforms = { environment: gl.getUniformLocation(program,"environment"), pointer: gl.getUniformLocation(program,"pointer"), resolution: gl.getUniformLocation(program,"resolution"), time: gl.getUniformLocation(program,"time"), bass: gl.getUniformLocation(program,"bass"), treble: gl.getUniformLocation(program,"treble") };
    const frequencies = new Uint8Array(256);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, last = 0, elapsed = 0, low = 0, high = 0, world = 0;
    const pointer = {x:0,y:0};
    const move = (e: PointerEvent) => { pointer.x=e.clientX/innerWidth-.5; pointer.y=.5-e.clientY/innerHeight; };
    window.addEventListener("pointermove",move);
    function render(now: number) {
      frame = requestAnimationFrame(render);
      if (document.hidden || roomVisible.current || now - last < 33) return;
      const delta = Math.min((now-last)/1000,.05); last = now;
      const width = Math.round(element.clientWidth * Math.min(devicePixelRatio,1.5));
      const height = Math.round(element.clientHeight * Math.min(devicePixelRatio,1.5));
      if (element.width !== width || element.height !== height) { element.width=width; element.height=height; gl!.viewport(0,0,width,height); }
      const a = audio.current;
      let bass = 0, treble = 0;
      if (a?.playing) {
        a.analyser.getByteFrequencyData(frequencies);
        bass = frequencies.slice(1,8).reduce((x,y)=>x+y,0)/(7*255);
        treble = frequencies.slice(15,75).reduce((x,y)=>x+y,0)/(60*255);

      }
      if (!reduce.matches) elapsed += delta;
      world = environmentRef.current;
      gl!.uniform1f(uniforms.environment,world); gl!.uniform2f(uniforms.pointer,reduce.matches?0:pointer.x,reduce.matches?0:pointer.y);
      low += (bass-low)*.09; high += (treble-high)*.09;
      gl!.uniform2f(uniforms.resolution,width,height); gl!.uniform1f(uniforms.time,elapsed); gl!.uniform1f(uniforms.bass,reduce.matches?0:low); gl!.uniform1f(uniforms.treble,reduce.matches?0:high);
      gl!.drawArrays(gl!.TRIANGLES,0,6);
    }
    frame = requestAnimationFrame(render);
    const lost = (e: Event) => { e.preventDefault(); setVisualFallback(true); cancelAnimationFrame(frame); };
    element.addEventListener("webglcontextlost",lost);
    return () => { window.removeEventListener("pointermove",move); cancelAnimationFrame(frame); element.removeEventListener("webglcontextlost",lost); gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(s=>gl.deleteShader(s)); };
  }, []);

  const record = records[currentRecord];
  return <section className={`solar-experience ambient-world world-${environment} ${playing ? "is-playing" : ""}`} aria-label="Ambientes para concentrarse">
    <canvas ref={canvas} className="solar-canvas" aria-hidden="true"/>
    {visualFallback && <div className="solar-fallback" aria-hidden="true"/>}
    {!showDiscs && <button className="open-discs" aria-label="Explorar vinilos" onClick={()=>setShowDiscs(true)}><Disc3 size={22}/></button>}
    {showDiscs && <Loft api={loftApi} getAudio={getAudio}
      onPhase={phase => { busyRef.current = phase === "placing"; setBusy(phase === "placing"); }}
      onPrepare={prepare} onPlay={begin}/>}
    {begun && <Dock record={record} playing={playing} busy={busy} volume={volume} muted={muted} status={status} song={song} accent={(moods[record.id] ?? idleMood).sky[0]}
      onToggle={() => void toggle()} onPrev={() => skip(-1)} onNext={() => skip(1)}
      onVolume={value => { setVolume(value); setMuted(false); }} onMute={() => setMuted(m => !m)}
      getLevels={() => audio.current?.playing ? spectrum.current : null}/>}
    <Fullscreen/>
    <div className="ambient-ui loft-controls">
      {error &&<button className="ambient-error" role="alert" onClick={() => void toggle()}>Activar sonido</button>}
    </div>
  </section>;
}
