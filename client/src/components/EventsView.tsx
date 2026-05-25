import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { getColors } from '../theme/colors';
import { useUIStore } from '../store/uiStore';
import EventCard from './cards/EventCard';
import ExclusiveOffers from './ExclusiveOffers';
import { Post } from '../types';
import { getDistance } from '../utils/geo';

interface Props {
  posts: Post[];
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

const EVENT_FILTERS = [
  { id: 'all', label: 'All Events', icon: '✨' },
  { id: 'near', label: 'Near Me', icon: '📍' },
  { id: 'week', label: 'This Week', icon: '🔥' },
  { id: 'free', label: 'Free Entry', icon: '🎟️' },
  { id: 'fest', label: 'College Fest', icon: '🎓' },
];

export default function EventsView({ posts, isLoading, onRefresh, onDelete, userLocation }: Props) {
  const isDark = useUIStore(s => s.isDark);
  const themeColors = getColors(isDark);
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const filteredPosts = useMemo(() => {
    let base = posts.filter(p => p.type === 'events' || p.type === 'bhandara');
    
    switch (activeFilter) {
      case 'near':
        if (!userLocation) return base;
        return [...base].sort((a, b) => {
          if (!a.location?.coordinates || !b.location?.coordinates) return 0;
          const dA = getDistance(userLocation.latitude, userLocation.longitude, a.location.coordinates[1], a.location.coordinates[0]);
          const dB = getDistance(userLocation.latitude, userLocation.longitude, b.location.coordinates[1], b.location.coordinates[0]);
          return dA - dB;
        });
      
      case 'week': {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return base.filter(p => {
          if (!p.eventDate) return false;
          const d = new Date(p.eventDate);
          return d >= now && d <= nextWeek;
        });
      }

      case 'free':
        return base.filter(p => 
          p.type === 'bhandara' || 
          (p.body + p.title).toLowerCase().includes('free') || 
          (p.body + p.title).toLowerCase().includes('no entry')
        );

      case 'fest':
        return base.filter(p => 
          p.isHot || 
          (p.body + p.title).toLowerCase().includes('fest') || 
          (p.body + p.title).toLowerCase().includes('annual')
        );

      default:
        return base;
    }
  }, [posts, activeFilter, userLocation]);

  const featuredEvent = useMemo(() => filteredPosts.find(p => p.isHot) || filteredPosts[0], [filteredPosts]);
  const regularEvents = useMemo(() => filteredPosts.filter(p => p._id !== featuredEvent?._id), [filteredPosts, featuredEvent]);

  const renderFeatured = () => {
    if (!featuredEvent || activeFilter !== 'all') return null;
    return (
      <View style={s.featuredContainer}>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: themeColors.txt3 }]}>FEATURED EVENT</Text>
        </View>
        <EventCard post={featuredEvent} onDelete={() => onDelete(featuredEvent._id)} />
      </View>
    );
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.ogi}
        />
      }
    >
      {/* Horizontal Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
        {EVENT_FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <TouchableOpacity 
              key={f.id} 
              onPress={() => setActiveFilter(f.id)}
              style={[
                s.filterPill, 
                { 
                  backgroundColor: isActive ? 'rgba(255,107,53,0.1)' : themeColors.card2, 
                  borderColor: isActive ? '#ff6b35' : themeColors.bdr 
                }
              ]}
            >
              <Text style={[s.filterTxt, { color: isActive ? '#ff6b35' : themeColors.txt2 }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {renderFeatured()}

      {filteredPosts.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 40 }}>🏜️</Text>
          <Text style={[s.emptyTxt, { color: themeColors.txt3 }]}>No events found for this filter.</Text>
        </View>
      ) : (
        <>
          {(regularEvents.length > 0 || activeFilter !== 'all') && (
            <View style={s.happeningHeader}>
              <Text style={[s.happeningTitle, { color: themeColors.txt }]}>
                {activeFilter === 'all' ? '🔥 HAPPENING THIS WEEK' : `✨ ${EVENT_FILTERS.find(f => f.id === activeFilter)?.label.toUpperCase()}`}
              </Text>
              <View style={s.headerLine} />
            </View>
          )}

          {(activeFilter === 'all' ? regularEvents : filteredPosts).map(event => (
            <EventCard key={event._id} post={event} onDelete={() => onDelete(event._id)} />
          ))}
        </>
      )}

      <ExclusiveOffers posts={posts} />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 20 },
  filterScroll: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  filterTxt: { fontSize: 13, fontWeight: '800' },
  featuredContainer: { paddingHorizontal: 16 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  happeningHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginVertical: 20 },
  happeningTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  headerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  empty: { padding: 40, alignItems: 'center', gap: 12 },
  emptyTxt: { fontSize: 14, fontWeight: '600' }
});
