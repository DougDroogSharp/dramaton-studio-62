// Per-speaker text colors: stable (hashed from the name), distinct,
// and readable on both the diesel-black box and paper balloons.

export const SPEAKER_COLORS = [
  '#8a6d2f', // dark amber
  '#2f6d8a', // slate blue
  '#3f7a38', // green
  '#9c3f46', // deep rose
  '#6d4f9c', // violet
  '#a05a20', // burnt orange
  '#2f7a6a', // teal
  '#7a6d20', // olive
];

export const speakerColor = (name: string): string => {
  const key = name.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SPEAKER_COLORS[h % SPEAKER_COLORS.length];
};

// Brighter variants for dark backgrounds (the narration box)
export const SPEAKER_COLORS_BRIGHT = [
  '#e8c878', '#8fd0e8', '#a8d8a0', '#e8a0a4', '#c8a8e8', '#e89860', '#88c8b8', '#d8d0a0',
];

export const speakerColorBright = (name: string): string => {
  const key = name.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SPEAKER_COLORS_BRIGHT[h % SPEAKER_COLORS_BRIGHT.length];
};
