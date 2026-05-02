export const light = {
  bg: "#F5F3EE",
  bg2: "#EDEAE3",
  bg3: "#E4E1D8",
  card: "#FFFFFF",
  card2: "#F5F3EE",
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
  nit: "#0D6E50",
  nitbg: "#EBF7F2",
  nitbdr: "#BFE6D8",
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
  bg: "#0F0F0D",
  bg2: "#181714",
  bg3: "#1E1D18",
  card: "#1C1B16",
  card2: "#242319",
  bdr: "#2E2D26",
  bdr2: "#3E3D34",
  txt: "#F0EEE5",
  txt2: "#8A8880",
  txt3: "#545248",
  ogi: "#E86050",
  ogibg: "#2A1A18",
  ogibdr: "#3A2522",
  lnct: "#7B6CE8",
  lnctbg: "#1C1A2E",
  lnctbdr: "#2C2950",
  nit: "#2DB885",
  nitbg: "#0F2520",
  nitbdr: "#1F3D35",
  gold: "#D4A030",
  goldbg: "#241E0A",
  danger: "#E06050",
  dangerbg: "#2A1515",
  warn: "#D4A030",
  warnbg: "#241E0A",
  ok: "#2DB885",
  okbg: "#0F2520",
  okbdr: "#1F3D35",
};

export type ThemeColors = typeof light;

// ✅ THIS WAS MISSING (main bug)
export const Colors: ThemeColors = light;
export const getColors = (isDark: boolean) => isDark ? dark : light;


// ---------------- HELPERS ----------------

export const campusColor = (c: string) =>
  c === 'ogi' ? Colors.ogi :
  c === 'lnct' ? Colors.lnct :
  Colors.nit;

export const campusBg = (c: string) =>
  c === 'ogi' ? Colors.ogibg :
  c === 'lnct' ? Colors.lnctbg :
  Colors.nitbg;

export const campusBdr = (c: string) =>
  c === 'ogi' ? Colors.ogibdr :
  c === 'lnct' ? Colors.lnctbdr :
  Colors.nitbdr;

export const campusLabel = (c: string) =>
  c === 'ogi' ? 'OGI' :
  c === 'lnct' ? 'LNCT' :
  'NIT';

export const vibeStyle = (vibe: string) => {
  if (!vibe) return null;

  if (vibe === 'funny') return { label: '😂 Funny', color: '#FACC15', bg: '#2A2105' };
  if (vibe === 'serious') return { label: '🧠 Serious', color: '#60A5FA', bg: '#0F1B2E' };
  if (vibe === 'rant') return { label: '😤 Rant', color: '#F87171', bg: '#2A0F12' };

  return null;
};