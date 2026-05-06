import { Platform } from 'react-native';

// ─── API URL ──────────────────────────────────────────────────────────────────
// EXPO_PUBLIC_API_URL in client/.env takes priority.
// LOCAL_IP fallback is your machine's LAN IP (run `ipconfig` to update if it changes).
const LOCAL_IP = '10.126.166.101';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:5000/api`;

// ─── Campus type & data ───────────────────────────────────────────────────────
export type Campus = 'ogi' | 'lnct' | 'all';

export interface CampusOption {
  value: Campus;      // Changed from id to value to match UI usage
  label: string;
  full?: string;      // Added optional full name
  color: string;
  bg: string;
  border: string;
  dotColor?: string;  // Added optional dotColor
}

export const CAMPUSES: CampusOption[] = [
  { value: 'ogi',  label: 'Oriental',  full: 'Oriental Group of Institutes',      color: '#C94030', bg: '#FDF1EF', border: '#F2C0B8', dotColor: '#C94030' },
  { value: 'lnct', label: 'LNCT',      full: 'Lakshmi Narain College of Technology', color: '#4D3DBF', bg: '#F0EEFB', border: '#C5BFF0', dotColor: '#4D3DBF' },
  { value: 'all',  label: 'Sneak In',  full: 'Sneak In to other campuses',               color: '#6B6860', bg: '#F5F3EE', border: '#DDD9CE', dotColor: '#6B6860' },
];

// Alias for backwards compatibility with parts of the app using CAMPUSES_LIST
export const CAMPUSES_LIST = CAMPUSES.filter(c => c.value !== 'all');

export const CAMPUS_META: Record<
  Exclude<Campus, 'all'>,
  { label: string; color: string; bg: string; bdr: string; emoji: string }
> = {
  ogi:  { label: 'Oriental',  color: '#C94030', bg: '#FDF1EF', bdr: '#F2C0B8', emoji: '🦊' },
  lnct: { label: 'LNCT', color: '#4D3DBF', bg: '#F0EEFB', bdr: '#C5BFF0', emoji: '🌙' },
};

// ─── Post types ───────────────────────────────────────────────────────────────
export interface PostType {
  value: string; // Changed from id to value
  label: string;
  icon: string;
}

export const POST_TYPES: PostType[] = [
  { value: 'thought', label: 'Discussion',  icon: '💬' },
  { value: 'confess', label: 'Confessions', icon: '🕳️' },
  { value: 'events',  label: 'Events',      icon: '📅' },
  { value: 'bhandara',label: 'Bhandara',    icon: '🍛' },
  { value: 'place',   label: 'Placement',   icon: '💼' },
];

// ─── Vibe metadata ────────────────────────────────────────────────────────────
export const VIBE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  funny:     { label: '😂 Funny',     color: '#FACC15', bg: '#2A2105', icon: '😂' },
  serious:   { label: '🧠 Serious',   color: '#60A5FA', bg: '#0F1B2E', icon: '🧠' },
  rant:      { label: '😤 Rant',      color: '#F87171', bg: '#2A0F12', icon: '😤' },
  spicy:     { label: '🌶️ Spicy',    color: '#FB923C', bg: '#2D160E', icon: '🌶️' },
  wholesome: { label: '💖 Wholesome', color: '#F472B6', bg: '#2D121F', icon: '💖' },
  hot:       { label: '🔥 Hot',       color: '#EF4444', bg: '#2D1010', icon: '🔥' },
  job:       { label: '💼 Career',    color: '#34D399', bg: '#064E3B', icon: '💼' },
  food:      { label: '🍛 Foodie',    color: '#F59E0B', bg: '#451A03', icon: '🍛' },
  general:   { label: '💬 General',   color: '#A8A69E', bg: '#1E1E1E', icon: '💬' },
};

// ─── Vibe auto-detector ───────────────────────────────────────────────────────
export const detectVibe = (text: string): string => {
  const t = text.toLowerCase();
  if (/placement|job|hiring|internship|interview|salary/.test(t)) return 'job';
  if (/bhandara|food|free food|khana|langar/.test(t)) return 'food';
  if (/lol|lmao|haha|funny|joke|😂|💀|🤣/.test(t)) return 'funny';
  if (/hate|rant|wtf|angry|frustrated|😤|😡/.test(t)) return 'rant';
  if (/love|wholesome|cute|sweet|heart|💖|🥺/.test(t)) return 'wholesome';
  if (/serious|important|help|question|🧠/.test(t)) return 'serious';
  if (/spicy|hot|🌶️|🔥|fire|lit/.test(t)) return 'spicy';
  return 'general';
};

// ─── Client-side content pre-check ───────────────────────────────────────────
export const checkContent = (
  text: string
): { level: 'clean' | 'mild' | 'bad'; reason?: string } => {
  if (!text) return { level: 'clean' };
  const t = text.toLowerCase();

  const phoneRegex = /(\+91|0)?[6-9]\d{9}/;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (phoneRegex.test(t) || emailRegex.test(t)) {
    return { level: 'bad', reason: 'Personal contact info not allowed.' };
  }

  const badWords = [
    'madarchod', 'behenchod', 'bhenchod', 'chutiya', 'chutiye',
    'randi', 'harami', 'bhosadike', 'gandu', 'balatkar',
    'fuck', 'fucker', 'cunt', 'nigger', 'rape', 'nude', 'porn',
    'suicide', 'kys', 'kill yourself',
  ];
  const mildWords = [
    'idiot', 'stupid', 'dumb', 'loser', 'hate', 'moron',
    'bakwas', 'bekar', 'bewakoof', 'gadha', 'bitch', 'asshole',
    'chamar', 'bhangi', 'retard', 'ugly',
  ];

  if (badWords.some((w) => t.includes(w))) {
    return { level: 'bad', reason: 'Content violates community guidelines.' };
  }
  if (mildWords.some((w) => t.includes(w))) {
    return { level: 'mild', reason: 'Content may be considered toxic.' };
  }
  return { level: 'clean' };
};