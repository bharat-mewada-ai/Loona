export type Campus = "nit" | "ogi" | "lnct" | "all";
export type TabFilter = "all" | "thought" | "confess" | "events" | "bhandara" | "place";
export type Vibe = "spicy" | "wholesome" | "funny" | "serious" | "rant" | "job" | "food" | "general";

export interface User {
  _id: string;
  name: string;        
  email: string;
  campus: Campus;
  karma: number;
  streak: number;
  avatar: string;      
  badges: string[];
  postCount: number;
  upvotesReceived: number; // Added missing field from profile.tsx
  campusRank: number;     // Added missing field from profile.tsx
  createdAt: string;
  role: 'user' | 'admin';
}

export interface Post {
  _id: string;
  title: string;
  body?: string;
  image?: string;
  eventDate?: string;
  eventLocation?: string;
  campus: Exclude<Campus, "all">;
  type: TabFilter;
  vibe: Vibe;
  anonName: string;
  anonAvatar: string;
  upvotes: number;
  commentCount: number;
  reactions: Record<string, number>;
  location?: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
  bhandaraStatus?: {
    yes: string[]; // user ids
    no: string[];
  };
  burnAfter24h: boolean;
  burn?: boolean;        // Requested field
  isHot: boolean;
  score: number;
  reportCount?: number;  // Requested field
  hidden?: boolean;      // Requested field
  createdAt: string;
  hasVoted?: boolean;
  author: string;   
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface PaginatedPosts {
  posts: Post[];
  total: number;
  page: number;
  hasMore: boolean;
}