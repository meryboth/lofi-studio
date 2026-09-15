// Visual character of each record: aurora colours and motion, snowfall, and how strongly the scene answers the music.
// sky: [curtain base, upper fringe, accent streaks] · speed/sway: aurora drift and ridge amplitude
// bass/high/beat: response gains · snow: 0–1 density · wind: lateral drift of the flakes
export type Mood = { sky: [string, string, string]; speed: number; sway: number; bass: number; high: number; beat: number; snow: number; wind: number };

export const idleMood: Mood = { sky: ["#39e5b1", "#cd4bff", "#4588ff"], speed: .5, sway: 1, bass: 1, high: 1, beat: .6, snow: .35, wind: .35 };

export const moods: Record<string, Mood> = {
  "solar":       { sky: ["#ffb347", "#ff5e62", "#8e44ff"], speed: .75, sway: 1.15, bass: 1.25, high: .9, beat: .8, snow: .4, wind: .6 },
  "blue-hours":  { sky: ["#3fe0c5", "#3a7bff", "#b44cff"], speed: .45, sway: .8, bass: .9, high: 1.15, beat: .5, snow: .7, wind: .3 },
  "after-dark":  { sky: ["#2ef2b4", "#5b6cff", "#ff4fd8"], speed: .3, sway: .6, bass: .8, high: .7, beat: .35, snow: 1, wind: .18 },
  "jardin":      { sky: ["#b8f26a", "#2fe39a", "#ffd166"], speed: .6, sway: 1, bass: 1.1, high: 1, beat: .7, snow: .3, wind: .5 },
  "soft-signal": { sky: ["#ff9ad5", "#9d7bff", "#5ee7ff"], speed: .5, sway: .9, bass: .9, high: 1.3, beat: .5, snow: .6, wind: .4 },
  "frecuencia":  { sky: ["#ff3d7f", "#ffb800", "#22d3ee"], speed: 1.1, sway: 1.3, bass: 1.6, high: 1.2, beat: 1.2, snow: .5, wind: .9 },
};
