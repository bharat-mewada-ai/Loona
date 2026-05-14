import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useUIStore } from '../store/uiStore';
import { getColors } from '../theme/colors';

type EmptyStateType = 'feed' | 'stories' | 'discussions' | 'confessions' | 'events' | 'bhandara' | 'nearby' | 'search' | 'notifications' | 'chats';

interface Props {
  type: EmptyStateType;
  onAction?: () => void;
}

const EMPTY_CONFIGS: Record<EmptyStateType, {
  emoji: string;
  title: string;
  subtitle: string;
  cta?: string;
  ctaEmoji?: string;
}> = {
  feed: {
    emoji: '🌵',
    title: "Too quiet in here.",
    subtitle: "Be the legend who posts first. Your campus is waiting.",
    cta: "Start the fire",
    ctaEmoji: "🔥",
  },
  stories: {
    emoji: '🤫',
    title: "No stories yet.",
    subtitle: "Your story could be the first one. Drop something that happened today — no names, just vibes.",
    cta: "Share a story",
    ctaEmoji: "📖",
  },
  discussions: {
    emoji: '💭',
    title: "No discussions yet.",
    subtitle: "Got a question? An opinion? A hot take? Start the conversation.",
    cta: "Start a discussion",
    ctaEmoji: "🗣️",
  },
  confessions: {
    emoji: '🕳️',
    title: "Deep silence.",
    subtitle: "Drop the secret no one else dares to share. It's safe here.",
    cta: "Confess anonymously",
    ctaEmoji: "🙈",
  },
  events: {
    emoji: '📅',
    title: "Nothing happening yet.",
    subtitle: "Got something planned? Post it — your whole campus will know.",
    cta: "Post an event",
    ctaEmoji: "🎉",
  },
  bhandara: {
    emoji: '🍛',
    title: "No free food alerts.",
    subtitle: "Spotted a bhandara? Do the campus a solid and spread the word.",
    cta: "Alert the campus",
    ctaEmoji: "📢",
  },
  nearby: {
    emoji: '👻',
    title: "No one around.",
    subtitle: "Enable location access or come back when more people are on campus.",
    cta: undefined,
  },
  search: {
    emoji: '🔭',
    title: "No results found.",
    subtitle: "Try different keywords or check your spelling.",
    cta: undefined,
  },
  notifications: {
    emoji: '🔔',
    title: "All caught up!",
    subtitle: "When something happens, you'll see it here.",
    cta: undefined,
  },
  chats: {
    emoji: '💬',
    title: "No chats yet.",
    subtitle: "Reply to posts or wave at people nearby to start anonymous conversations.",
    cta: undefined,
  },
};

export default function EmptyState({ type, onAction }: Props) {
  const isDark = useUIStore(s => s.isDark);
  const themeColors = getColors(isDark);
  const config = EMPTY_CONFIGS[type];

  return (
    <View style={s.container}>
      <Text style={s.emoji}>{config.emoji}</Text>
      <Text style={[s.title, { color: themeColors.txt }]}>{config.title}</Text>
      <Text style={[s.subtitle, { color: themeColors.txt3 }]}>{config.subtitle}</Text>
      {!!config.cta && !!onAction && (
        <TouchableOpacity
          style={[s.cta, { backgroundColor: themeColors.ogi }]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={s.ctaEmoji}>{config.ctaEmoji}</Text>
          <Text style={s.ctaTxt}>{config.cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    fontWeight: '500',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  ctaEmoji: { fontSize: 16 },
  ctaTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
