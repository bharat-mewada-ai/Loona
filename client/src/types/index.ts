export type Campus = "ogi" | "lnct" | "all";
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
  upvotesReceived: number;
  campusRank: number;
  isPrivate: boolean;
  notificationsEnabled: boolean;
  bio: string;
  tags: string[];
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
  isPoll?: boolean;
  pollOptions?: { text: string; votes: number }[];
  userVote?: number | null;
  bhandaraCountYes?: number;
  bhandaraCountNo?: number;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface Notification {
  _id: string;
  recipient: string;
  sender?: string;
  type: "upvote" | "reaction" | "comment" | "mention" | "system";
  title: string;
  body: string;
  data: {
    postId?: string;
    commentId?: string;
    chatId?: string;
  };
  read: boolean;
  createdAt: string;
}

export interface PaginatedPosts {
  posts: Post[];
  total: number;
  page: number;
  hasMore: boolean;
}
export interface Chat {
  _id: string;
  participants: string[];
  lastMessage?: string;
  unreadCount?: number;
  identities?: {
    me: { name: string; avatar: string };
    other: { name: string; avatar: string };
  };
  updatedAt: string;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  content: string;
  image?: string;
  senderType: 'me' | 'other';
  createdAt: string;
}
