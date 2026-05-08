export const light = {
  bg: "#F5F3EE",
  bg2: "#EDEAE3",
  bg3: "#E4E1D8",
  card: "#FFFFFF",
  card2: "#F5F3EE",
  card3: "#EDEAE3",
  bdr: "#DDD9CE",
  bdr2: "#C8C4B7",
  txt: "#18170F",
  txt2: "#6B6860",
  txt3: "#A8A69E",
  ogi: "#C94030",
  ogibg: "#FDF1EF",
  ogibdr: "#E5B7B0",
  lnct: "#4D3DBF",
  lnctbg: "#F0EEFB",
  lnctbdr: "#C7C2F3",
  gold: "#9A6E00",
  goldbg: "#FDF6E3",
  danger: "#B83030",
  dangerbg: "#FDEEEE",
  warn: "#9A6000",
  warnbg: "#FDF4E0",
  ok: "#2E7D32",
  okbg: "#F1F8F1",
  okbdr: "#A5D6A7",
};

export const dark: typeof light = {
  bg: "#000000",
  bg2: "#0A0A0A",
  bg3: "#121212",
  card: "#161616",
  card2: "#1F1F1F",
  card3: "#2A2A2A",
  bdr: "#262626",
  bdr2: "#333333",
  txt: "#FFFFFF",
  txt2: "#A0A0A0",
  txt3: "#666666",
  ogi: "#FF6B00",
  ogibg: "#1A0D00",
  ogibdr: "#331A00",
  lnct: "#7B6CE8",
  lnctbg: "#1C1A2E",
  lnctbdr: "#2C2950",
  gold: "#FFB800",
  goldbg: "#1A1500",
  danger: "#FF4444",
  dangerbg: "#1A0000",
  warn: "#FFB800",
  warnbg: "#1A1500",
  ok: "#00C853",
  okbg: "#001A07",
  okbdr: "#00330E",
};

export type ThemeColors = typeof light;

// ✅ THIS WAS MISSING (main bug)
export const Colors: ThemeColors = light;
export const getColors = (isDark: boolean) => isDark ? dark : light;


// ---------------- HELPERS ----------------

export const campusColor = (c: string) =>
  c === 'ogi' ? Colors.ogi :
  Colors.lnct;

export const campusBg = (c: string) =>
  c === 'ogi' ? Colors.ogibg :
  Colors.lnctbg;

export const campusBdr = (c: string) =>
  c === 'ogi' ? Colors.ogibdr :
  Colors.lnctbdr;

export const campusLabel = (c: string) =>
  c === 'ogi' ? 'Oriental' :
  'LNCT';

export const vibeStyle = (vibe: string) => {
  if (!vibe) return null;

  if (vibe === 'funny') return { label: '😂 Funny', color: '#FACC15', bg: '#2A2105' };
  if (vibe === 'serious') return { label: '🧠 Serious', color: '#60A5FA', bg: '#0F1B2E' };
  if (vibe === 'rant') return { label: '😤 Rant', color: '#F87171', bg: '#2A0F12' };

  return null;
};