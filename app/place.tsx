"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, LoaderCircle, MapPin, Moon, Sun, type LucideIcon } from "lucide-react";

type Spot = { city: string; lat: number; lon: number; temp: number; code: number; day: boolean; at: number };
const KEY = "surco.place", FRESH = 30 * 60e3;

// WMO weather interpretation codes (Open-Meteo) → label and icon.
function describe(code: number, day: boolean): [string, LucideIcon] {
  if (code === 0) return ["Despejado", day ? Sun : Moon];
  if (code <= 2) return ["Algo nublado", day ? CloudSun : CloudMoon];
  if (code === 3) return ["Nublado", Cloud];
  if (code <= 48) return ["Niebla", CloudFog];
  if (code <= 57) return ["Llovizna", CloudDrizzle];
  if (code <= 67 || (code >= 80 && code <= 82)) return ["Lluvia", CloudRain];
  if (code <= 77 || code === 85 || code === 86) return ["Nieve", CloudSnow];
  return ["Tormenta", CloudLightning];
}
const dms = (v: number, pos: string, neg: string) => { const a = Math.abs(v); let d = Math.floor(a), m = Math.round((a - d) * 60); if (m === 60) { d++; m = 0; } return `${d}°${String(m).padStart(2, "0")}′ ${v >= 0 ? pos : neg}`; };
const zoneCity = () => (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "").split("/").pop()?.replace(/_/g, " ") ?? "";

// Place, weather and local time. Until the visitor opts in, the city comes from the device time zone and nothing leaves the
// browser. Tapping the pill asks for geolocation; coordinates rounded to ~1 km then go to Open-Meteo (weather) and
// BigDataCloud (city name). The result is cached for 30 minutes and refreshed while the page stays open.
export default function Place() {
  const [now, setNow] = useState<Date | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "denied">("idle");

  async function lookup(lat: number, lon: number, known?: string) {
    const weather = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`).then(r => r.json());
    let city = known;
    if (!city) {
      const place = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`).then(r => r.json()).catch(() => null);
      city = place?.locality || place?.city || place?.principalSubdivision || zoneCity();
    }
    const next: Spot = { city: city ?? "", lat, lon, temp: weather.current.temperature_2m, code: weather.current.weather_code, day: weather.current.is_day === 1, at: Date.now() };
    setSpot(next); setStatus("idle");
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }
  function locate() {
    if (!navigator.geolocation) return setStatus("denied");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      pos => void lookup(Math.round(pos.coords.latitude * 100) / 100, Math.round(pos.coords.longitude * 100) / 100).catch(() => setStatus("idle")),
      () => setStatus("denied"),
      { timeout: 12000, maximumAge: FRESH });
  }

  useEffect(() => {
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 15e3);
    let cached: Spot | null = null;
    try { cached = JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch {}
    if (cached) { setSpot(cached); if (Date.now() - cached.at > FRESH) void lookup(cached.lat, cached.lon, cached.city).catch(() => {}); }
    else navigator.permissions?.query({ name: "geolocation" }).then(p => { if (p.state === "granted") locate(); }).catch(() => {});
    return () => clearInterval(clock);
  }, []);
  useEffect(() => {
    if (!spot) return;
    const refresh = setInterval(() => void lookup(spot.lat, spot.lon, spot.city).catch(() => {}), FRESH / 2);
    return () => clearInterval(refresh);
  }, [spot?.lat, spot?.lon]);

  if (!now) return null;
  const time = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const [label, Icon] = spot ? describe(spot.code, spot.day) : ["", Sun];
  return <div className="place-pill">
    <button className="place-where" onClick={locate} disabled={status === "locating"} title={spot ? "Actualizar ubicación" : "Usar mi ubicación para ver el clima"}>
      {status === "locating" ? <LoaderCircle size={15} className="spin"/> : <MapPin size={15}/>}
      <span>
        <span className="place-city">{(spot?.city || zoneCity()).toUpperCase()}</span>
        <span className="place-meta">{spot ? `${dms(spot.lat, "N", "S")}  ${dms(spot.lon, "E", "O")}` : status === "denied" ? "Ubicación no disponible" : "Usar mi ubicación"}</span>
      </span>
    </button>
    {spot && <><i className="place-divider"/><span className="place-weather" title={label} aria-label={`${label}, ${Math.round(spot.temp)} grados`}><Icon size={17}/>{Math.round(spot.temp)}°</span></>}
    <i className="place-divider"/>
    <time className="place-time" dateTime={now.toISOString()}>{time}</time>
  </div>;
}
