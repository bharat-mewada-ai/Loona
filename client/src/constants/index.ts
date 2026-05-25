import { Platform } from 'react-native';

// ─── API URL ──────────────────────────────────────────────────────────────────
// EXPO_PUBLIC_API_URL in client/.env takes priority.
// LOCAL_IP fallback is your machine's LAN IP (run `ipconfig` to update if it changes).
const LOCAL_IP = '10.126.166.101'; // Update this to your local IP for dev
const ENV_URL = process.env.EXPO_PUBLIC_API_URL;

// Ensure API_URL always ends with /v1 to avoid mismatch between interceptors and manual fetch calls
export const API_URL = ENV_URL || `http://${LOCAL_IP}:5000/api/v1`;

if (__DEV__) {
  console.log('[Config] API_URL:', API_URL);
}

// ─── Google Auth Configuration ────────────────────────────────────────────────
export const GOOGLE_AUTH = {
  WEB_CLIENT_ID: '329290971821-116b0s90hp4dfr5aii772hk5cbs0t457.apps.googleusercontent.com',
  ANDROID_CLIENT_ID: '329290971821-kh0a91v046d91hfauv9u6fk4k5nvmj96.apps.googleusercontent.com',
  IOS_CLIENT_ID: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com', // Placeholder if not defined
};

// ─── Campus type & data ───────────────────────────────────────────────────────
export type Campus = 'ogi' | 'lnct' | 'all';

export interface CampusOption {
  value: Campus;
  label: string;
  full?: string;
  color: string;
  bg: string;
  darkBg?: string;
  border: string;
  dotColor?: string;
}

export const CAMPUSES: CampusOption[] = [
  { value: 'ogi',  label: 'Oriental',  full: 'Oriental Group of Institutes',         color: '#C94030', bg: '#FDF1EF', darkBg: '#2A0F0C', border: '#F2C0B8', dotColor: '#C94030' },
  { value: 'lnct', label: 'LNCT',      full: 'Lakshmi Narain College of Technology', color: '#4D3DBF', bg: '#F0EEFB', darkBg: '#110D2E', border: '#C5BFF0', dotColor: '#4D3DBF' },
  { value: 'all',  label: 'Sneak In',  full: 'Sneak into the other campus',          color: '#6B6860', bg: '#F5F3EE', border: '#DDD9CE', dotColor: '#6B6860' },
];

// Alias for backwards compatibility with parts of the app using CAMPUSES_LIST
export const CAMPUSES_LIST = CAMPUSES.filter(c => c.value !== 'all');

export const CAMPUS_META: Record<
  Exclude<Campus, 'all'>,
  { label: string; color: string; bg: string; bdr: string; emoji: string }
> = {
  ogi:  { label: 'Oriental', color: '#C94030', bg: '#FDF1EF', bdr: '#F2C0B8', emoji: '🦊' },
  lnct: { label: 'LNCT',    color: '#4D3DBF', bg: '#F0EEFB', bdr: '#C5BFF0', emoji: '🌙' },
};

// ─── Post types ───────────────────────────────────────────────────────────────
export interface PostType {
  value: string; // Changed from id to value
  label: string;
  icon: string;
}

export const POST_TYPES: PostType[] = [
  { value: 'all', label: 'Feed', icon: '✦' },
  { value: 'discussion', label: 'Discussions', icon: '🗣️' },
  { value: 'confess', label: 'Confessions', icon: '🕳️' },
  { value: 'events',  label: 'Events',      icon: '📅' },
  { value: 'bhandara',label: 'Bhandara',    icon: '🍛' },
];


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