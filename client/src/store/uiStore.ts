import { create } from 'zustand';
import type { Campus, TabFilter } from '../types';

interface UIState {
  // ── Theme ──────────────────────────────────────────────────────────────────
  isDark: boolean;
  toggleDark: () => void;

  // ── Feed filters ───────────────────────────────────────────────────────────
  activeCampus: Campus;
  activeTab: TabFilter;
  setCampus: (c: Campus) => void;
  setTab: (t: TabFilter) => void;

  // ── Compose sheet (post creation) ─────────────────────────────────────────
  showComposeSheet: boolean;
  composeType: TabFilter;
  openComposeSheet: (type: TabFilter) => void;
  closeComposeSheet: () => void;
  setComposeType: (type: TabFilter) => void;

  // ── Report sheet ──────────────────────────────────────────────────────────
  showReportSheet: boolean;
  reportPostId: string | null;
  authorProfile: { userId: string; postId: string; anonName: string; anonAvatar: string; isSelf: boolean; postCampus: string; bio?: string; isVerified?: boolean } | null;

  openReportSheet: (id: string) => void;
  closeReportSheet: () => void;
  
  openAuthorProfile: (profile: { userId: string; postId: string; anonName: string; anonAvatar: string; isSelf: boolean; postCampus: string; bio?: string; isVerified?: boolean }) => void;
  closeAuthorProfile: () => void;

  // ── Comment sheet ─────────────────────────────────────────────────────────
  showCommentSheet: boolean;
  commentPostId: string | null;
  openCommentSheet: (postId: string) => void;
  closeCommentSheet: () => void;

  // ── New Support Sheets ─────────────────────────────────────────────────────
  showFeedbackSheet: boolean;
  showPrivacySheet: boolean;
  openFeedbackSheet: () => void;
  closeFeedbackSheet: () => void;
  openPrivacySheet: () => void;
  closePrivacySheet: () => void;

  // ── Haptics ────────────────────────────────────────────────────────────────
  hapticsEnabled: boolean;
  toggleHaptics: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Theme
  isDark: false,
  toggleDark: () => set((s) => ({ isDark: !s.isDark })),

  // Feed filters
  activeCampus: 'all',
  activeTab: 'all',
  setCampus: (activeCampus) => set({ activeCampus }),
  setTab: (activeTab) => set({ activeTab }),

  // Compose sheet
  showComposeSheet: false,
  composeType: 'thought' as TabFilter,
  openComposeSheet: (type) =>
    set({ showComposeSheet: true, composeType: type }),
  closeComposeSheet: () => set({ showComposeSheet: false }),
  setComposeType: (composeType) => set({ composeType }),

  // Report sheet
  showReportSheet: false,
  reportPostId: null,
  authorProfile: null,

  openReportSheet: (id) => set({ showReportSheet: true, reportPostId: id }),
  closeReportSheet: () => set({ showReportSheet: false, reportPostId: null }),

  openAuthorProfile: (profile) => set({ authorProfile: profile }),
  closeAuthorProfile: () => set({ authorProfile: null }),

  // Comment sheet
  showCommentSheet: false,
  commentPostId: null,
  openCommentSheet: (postId) => set({ showCommentSheet: true, commentPostId: postId }),
  closeCommentSheet: () => set({ showCommentSheet: false, commentPostId: null }),

  // Support Sheets
  showFeedbackSheet: false,
  showPrivacySheet: false,
  openFeedbackSheet: () => set({ showFeedbackSheet: true }),
  closeFeedbackSheet: () => set({ showFeedbackSheet: false }),
  openPrivacySheet: () => set({ showPrivacySheet: true }),
  closePrivacySheet: () => set({ showPrivacySheet: false }),

  // Haptics
  hapticsEnabled: true,
  toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
}));