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
  manit: "#0D9488",
  manitbg: "#F0FDF4",
  manitbdr: "#CCFBF1",
  rgpv: "#DB2777",
  rgpvbg: "#FDF2F8",
  rgpvbdr: "#FBCFE8",
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
  bg: "#0F1115",
  bg2: "#111113",
  bg3: "#161618",
  card: "#141416",
  card2: "#1c1c1f",
  card3: "#252528",
  bdr: "#222225",
  bdr2: "#333333",
  txt: "#c8c8d0",
  txt2: "#a0a0a8",
  txt3: "#666666",
  ogi: "#FF6B00",
  ogibg: "#1A0D00",
  ogibdr: "#331A00",
  lnct: "#7B6CE8",
  lnctbg: "#1C1A2E",
  lnctbdr: "#2C2950",
  manit: "#0D9488",
  manitbg: "#064E3B",
  manitbdr: "#0F766E",
  rgpv: "#EC4899",
  rgpvbg: "#50072B",
  rgpvbdr: "#831843",
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
  c === 'lnct' ? Colors.lnct :
  c === 'manit' ? Colors.manit :
  c === 'rgpv' ? Colors.rgpv :
  Colors.lnct;

export const campusBg = (c: string) =>
  c === 'ogi' ? Colors.ogibg :
  c === 'lnct' ? Colors.lnctbg :
  c === 'manit' ? Colors.manitbg :
  c === 'rgpv' ? Colors.rgpvbg :
  Colors.lnctbg;

export const campusBdr = (c: string) =>
  c === 'ogi' ? Colors.ogibdr :
  c === 'lnct' ? Colors.lnctbdr :
  c === 'manit' ? Colors.manitbdr :
  c === 'rgpv' ? Colors.rgpvbdr :
  Colors.lnctbdr;

export const campusLabel = (c: string) =>
  c === 'ogi' ? 'Oriental' :
  c === 'lnct' ? 'LNCT' :
  c === 'manit' ? 'MANIT' :
  c === 'rgpv' ? 'RGPV' :
  'LNCT';

export const vibeStyle = (vibe: string) => {
  if (!vibe) return null;

  if (vibe === 'funny') return { label: '😂 Funny', color: '#FACC15', bg: '#2A2105' };
  if (vibe === 'serious') return { label: '🧠 Serious', color: '#60A5FA', bg: '#0F1B2E' };
  if (vibe === 'rant') return { label: '😤 Rant', color: '#F87171', bg: '#2A0F12' };

  return null;
};