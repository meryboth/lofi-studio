"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

// Safari still ships the prefixed Fullscreen API on some versions.
type WebkitDocument = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
const doc = () => document as WebkitDocument;
const active = () => !!(doc().fullscreenElement ?? doc().webkitFullscreenElement);

// Fullscreen toggle (button or the F key). Hidden where the browser cannot make the page fullscreen, e.g. iPhone Safari.
export default function Fullscreen() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);

  async function toggle() {
    try {
      if (active()) await (doc().exitFullscreen?.() ?? doc().webkitExitFullscreen?.());
      else { const root = document.documentElement as WebkitElement; await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.()); }
    } catch {}
  }

  useEffect(() => {
    setSupported(!!(doc().fullscreenEnabled || doc().webkitFullscreenEnabled));
    const sync = () => setOn(active());
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f" || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault(); void toggle();
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("fullscreenchange", sync); document.removeEventListener("webkitfullscreenchange", sync); window.removeEventListener("keydown", key); };
  }, []);

  if (!supported) return null;
  const label = on ? "Salir de pantalla completa" : "Pantalla completa";
  return <button className="fullscreen-toggle" onClick={() => void toggle()} aria-label={label} aria-pressed={on} title={`${label} (F)`}>
    {on ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}
  </button>;
}
