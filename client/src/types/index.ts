export type Campus = "ogi" | "lnct" | "all";
export type TabFilter = "all" | "discussion" | "confess" | "stories" | "events" | "bhandara" | "place" | "offers";

export interface User {
  _id: string;
  name: string;        
  email: string;
  campus: Campus;
  potato: number;
  streak: number;
  avatar: string;      
  postCount: number;
  upvotesReceived: number;
  commentsCount: number;
  campusRank: number;
  isPrivate: boolean;
  isVerified: boolean;
  isPremium: boolean;
  notificationsEnabled: boolean;
  bio: string;
  tags: string[];
  createdAt: string;
  role: 'user' | 'admin';
  savedPosts: string[];
  premiumExpiresAt?: string;
  // Soft-delete grace period
  scheduledForDeletion?: boolean;
  deletionScheduledAt?: string;
  dailyUpvotesCount?: number;
  dailyPostsCount?: number;
  questsCompletedToday?: boolean;
  lastQuestResetDate?: string;
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
  author: {
    _id: string;
    name?: string;
    avatar?: string;
    bio?: string;
    isVerified?: boolean;
    isTopContributor?: boolean;
    isPremium?: boolean;
    badges?: { name: string; icon: string }[];
    tags?: string[];
  };   
  isPoll?: boolean;
  pollOptions?: { text: string; votes: number }[];
  userVote?: number | null;
  bhandaraCountYes?: number;
  bhandaraCountNo?: number;
  hasGone?: boolean;
  goingCount?: number;
  offerBrand?: string;
  isExclusive?: boolean;
  offerDiscount?: string;
  isSaved?: boolean;
  externalLink?: string;
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
  type: "upvote" | "reaction" | "comment" | "mention" | "wave" | "message" | "system";
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
  participants?: string[];
  lastMessage?: any;
  unreadCount?: number;
  isAnonymous?: boolean;
  anonAuthorId?: string;
  isRevealed?: boolean;
  identities?: {
    me: { name: string; avatar: string; id?: string };
    other: { name: string; avatar: string; id?: string | null; lastActive?: string | null };
  };
  updatedAt?: string;
  // Flattened fields from backend getChats
  name?: string;
  avatar?: string;
  preview?: string;
  unread?: number;
  time?: string;
  lastActive?: string;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId?: string;
  content: string;
  image?: string;
  senderType: 'me' | 'other';
  senderName?: string;
  senderAvatar?: string;
  reactions?: Record<string, string>;
  createdAt: string;
}

export type ShopCategory = 'books' | 'notes' | 'stationery' | 'electronics' | 'clothing' | 'other';
export type ShopStatus = 'pending_payment' | 'available' | 'sold';

export interface ShopItem {
  _id: string;
  title: string;
  description: string;
  price: number;          // in INR ₹
  category: ShopCategory;
  seller: {
    _id: string;
    name: string;
    avatar: string;
    campus: string;
  };
  campus: string;
  status: ShopStatus;
  sellerUpi: string;
  sellerContact: string;
  isFeatured: boolean;
  listingFeePaid: boolean;
  image?: string;
  createdAt: string;
}
