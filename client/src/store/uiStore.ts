import { create } from 'zustand';
import { Appearance } from 'react-native';
import { storage } from '../utils/storage';
import type { Campus, TabFilter } from '../types';

interface UIState {
  // ── Theme ──────────────────────────────────────────────────────────────────
  isDark: boolean;
  toggleDark: () => void;
  loadStoredTheme: () => Promise<void>;

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
  authorProfile: { 
    userId: string; 
    postId: string; 
    anonName: string; 
    anonAvatar: string; 
    isSelf: boolean; 
    postCampus: string; 
    bio?: string; 
    isVerified?: boolean;
    isPremium?: boolean;
    isConfession?: boolean;
    badges?: { name: string; icon: string }[];
  } | null;

  openReportSheet: (id: string) => void;
  closeReportSheet: () => void;
  
  openAuthorProfile: (profile: { 
    userId: string; 
    postId: string; 
    anonName: string; 
    anonAvatar: string; 
    isSelf: boolean; 
    postCampus: string; 
    bio?: string; 
    isVerified?: boolean;
    isPremium?: boolean;
    isConfession?: boolean;
    badges?: { name: string; icon: string }[];
  }) => void;
  closeAuthorProfile: () => void;

  // ── Comment sheet ─────────────────────────────────────────────────────────
  showCommentSheet: boolean;
  commentPostId: string | null;
  openCommentSheet: (postId: string) => void;
  closeCommentSheet: () => void;

  // ── Story Viewer ──────────────────────────────────────────────────────────
  showStoryViewer: boolean;
  activeStoryId: string | null;
  storyList: string[]; // List of IDs in the current rail
  openStoryViewer: (id: string, list?: string[]) => void;
  closeStoryViewer: () => void;

  // ── New Support Sheets ─────────────────────────────────────────────────────
  showFeedbackSheet: boolean;
  showPrivacySheet: boolean;
  openFeedbackSheet: () => void;
  closeFeedbackSheet: () => void;
  openPrivacySheet: () => void;
  closePrivacySheet: () => void;
  
  // ── Upload sheet ─────────────────────────────────────────────────────────
  showUploadSheet: boolean;
  openUploadSheet: () => void;
  closeUploadSheet: () => void;

  // ── Haptics ────────────────────────────────────────────────────────────────
  hapticsEnabled: boolean;
  toggleHaptics: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Theme
  isDark: Appearance.getColorScheme() === 'dark',
  toggleDark: () => {
    set((s) => {
      const newDark = !s.isDark;
      storage.setItem('loona_theme', newDark ? 'dark' : 'light');
      return { isDark: newDark };
    });
  },
  loadStoredTheme: async () => {
    try {
      const savedTheme = await storage.getItem('loona_theme');
      if (savedTheme) {
        set({ isDark: savedTheme === 'dark' });
      }
      const savedHaptics = await storage.getItem('loona_haptics');
      if (savedHaptics !== null) {
        set({ hapticsEnabled: savedHaptics === 'true' });
      }
    } catch (e) {
      console.log('Failed to load prefs', e);
    }
  },

  // Feed filters
  activeCampus: 'all',
  activeTab: 'all',
  setCampus: (activeCampus) => set({ activeCampus }),
  setTab: (activeTab) => set({ activeTab }),

  // Compose sheet
  showComposeSheet: false,
  composeType: 'discussion' as TabFilter,
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

  // Story Viewer
  showStoryViewer: false,
  activeStoryId: null,
  storyList: [],
  openStoryViewer: (id, list = []) => set({ showStoryViewer: true, activeStoryId: id, storyList: list }),
  closeStoryViewer: () => set({ showStoryViewer: false, activeStoryId: null, storyList: [] }),

  // Support Sheets
  showFeedbackSheet: false,
  showPrivacySheet: false,
  openFeedbackSheet: () => set({ showFeedbackSheet: true }),
  closeFeedbackSheet: () => set({ showFeedbackSheet: false }),
  openPrivacySheet: () => set({ showPrivacySheet: true }),
  closePrivacySheet: () => set({ showPrivacySheet: false }),

  // Upload sheet
  showUploadSheet: false,
  openUploadSheet: () => set({ showUploadSheet: true }),
  closeUploadSheet: () => set({ showUploadSheet: false }),

  // Haptics
  hapticsEnabled: true,
  toggleHaptics: () => set((s) => {
    const newVal = !s.hapticsEnabled;
    storage.setItem('loona_haptics', newVal ? 'true' : 'false').catch(() => {});
    return { hapticsEnabled: newVal };
  }),
}));