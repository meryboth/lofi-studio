"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from "lucide-react";
import type { RecordItem } from "./records";

export type StreamStatus = "idle" | "connecting" | "live" | "offline";
export type Song = { title: string; artist: string };
type Props = {
  record: RecordItem; playing: boolean; busy: boolean; volume: number; muted: boolean; accent: string; status: StreamStatus; song: Song | null;
  onToggle: () => void; onPrev: () => void; onNext: () => void; onVolume: (value: number) => void; onMute: () => void;
  getLevels: () => Uint8Array | null;
};
const BARS = 14, COVER = 48;

// Floating player in "liquid glass": a frosted, saturated backdrop, a specular sheen that follows the pointer, a refracting
// edge where the browser supports SVG backdrop filters (Chromium), and a glow that breathes with the music.
// Levels are written straight to styles from a rAF loop so the player never re-renders per frame.
export default function Dock(p: Props) {
  const dock = useRef<HTMLDivElement>(null), bars = useRef<(HTMLSpanElement | null)[]>([]);
  const live = useRef(p); live.current = p;
  const [refract, setRefract] = useState(false);

  useEffect(() => {
    const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands ?? [];
    setRefract(brands.some(b => b.brand === "Chromium"));
    let frame = 0, energy = 0;
    const smooth = new Float32Array(BARS);
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const levels = live.current.getLevels();
      let sum = 0;
      for (let i = 0; i < BARS; i++) {
        const v = levels ? levels[Math.floor(Math.pow(i / BARS, 1.6) * 90) + 2] / 255 : 0;
        smooth[i] += (v - smooth[i]) * (v > smooth[i] ? .5 : .12); sum += smooth[i];
        const bar = bars.current[i]; if (bar) bar.style.transform = `scaleY(${(.12 + smooth[i] * .88).toFixed(3)})`;
      }
      energy += (sum / BARS - energy) * .15;
      dock.current?.style.setProperty("--energy", energy.toFixed(3));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const [x, y, w, h] = p.record.crop;
  const cover: CSSProperties = { backgroundSize: `${1536 * COVER / w}px ${1024 * COVER / h}px`, backgroundPosition: `${-x * COVER / w}px ${-y * COVER / h}px` };
  const level = p.muted ? 0 : p.volume;
  const VolumeIcon = level === 0 ? VolumeX : level < .5 ? Volume1 : Volume2;
  const onAir = p.playing && p.status === "live";
  const kicker = onAir ? "En vivo" : p.status === "connecting" ? "Conectando" : p.status === "offline" ? "Sin conexión" : "En pausa";
  const line = p.status === "offline" ? "Sonido local hasta que vuelva la radio" : p.song ? `${p.song.artist} — ${p.song.title}` : `${p.record.artist} · ${p.record.genre}`;
  return <div ref={dock} role="region" aria-label="Reproductor"
    className={`glass-dock${refract ? " refract" : ""}${p.playing ? " is-playing" : ""}${onAir ? " is-live" : ""}${p.status === "connecting" ? " is-connecting" : ""}`} style={{ "--accent": p.accent } as CSSProperties}
    onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`); }}>
    <svg className="glass-defs" aria-hidden="true"><filter id="liquid-glass" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006 .011" numOctaves="2" seed="4" result="noise"/><feGaussianBlur in="noise" stdDeviation="2.5" result="soft"/><feDisplacementMap in="SourceGraphic" in2="soft" scale="26" xChannelSelector="R" yChannelSelector="G"/></filter></svg>
    <div className="dock-art" aria-hidden="true"><span className="dock-vinyl"/><span className="dock-cover" style={cover}/></div>
    <div className="dock-meta">
      <span className="dock-kicker">{onAir && <i className="dock-dot"/>}{kicker} · <a href={`https://somafm.com/${p.record.station.id}/`} target="_blank" rel="noreferrer">SomaFM<span className="dock-station"> {p.record.station.name}</span></a></span>
      <strong>{p.record.title}</strong>
      <span className="dock-song" title={line} aria-live="polite">{line}</span>
    </div>
    <div className="dock-transport">
      <button className="dock-skip" aria-label="Disco anterior" disabled={p.busy} onClick={p.onPrev}><SkipBack size={16} fill="currentColor"/></button>
      <button className="dock-play" aria-label={p.playing ? "Pausar" : "Reproducir"} disabled={p.busy} onClick={p.onToggle}>{p.playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button>
      <button className="dock-skip" aria-label="Disco siguiente" disabled={p.busy} onClick={p.onNext}><SkipForward size={16} fill="currentColor"/></button>
    </div>
    <div className="dock-bars" aria-hidden="true">{Array.from({ length: BARS }, (_, i) => <span key={i} ref={el => { bars.current[i] = el; }}/>)}</div>
    <div className="dock-volume">
      <button aria-label={p.muted ? "Activar sonido" : "Silenciar"} onClick={p.onMute}><VolumeIcon size={17}/></button>
      <input type="range" min={0} max={1} step={.01} value={level} aria-label="Volumen" style={{ "--level": `${level * 100}%` } as CSSProperties} onChange={e => p.onVolume(Number(e.target.value))}/>
    </div>
  </div>;
}
