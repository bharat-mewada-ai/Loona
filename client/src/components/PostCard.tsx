import React from 'react';
import { Alert } from 'react-native';
import { Post } from '../types';
import { useDeletePost } from '../hooks/usePosts';
import { useUIStore } from '../store/uiStore';

// Specialized Cards
import StandardCard from './cards/StandardCard';
import ConfessionCard from './cards/ConfessionCard';
import EventCard from './cards/EventCard';
import StoryCard from './cards/StoryCard';
import OfferCard from './cards/OfferCard';

interface Props {
  post: Post;
  isAllTab?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
}

export default function PostCard({ post, isAllTab, userLocation }: Props) {
  const { mutate: deletePost } = useDeletePost();
  const { openReportSheet } = useUIStore();

  const handleDelete = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deletePost(post._id) }
      ]
    );
  };

  const handleReport = () => {
    openReportSheet(post._id);
  };

  // Route to specialized card
  switch (post.type) {
    case 'stories':
      return <StoryCard post={post} onDelete={handleDelete} />;
    
    case 'offers':
      return <OfferCard post={post} onDelete={handleDelete} />;
    
    default:
      return (
        <StandardCard 
          post={post} 
          isAllTab={isAllTab} 
          userLocation={userLocation} 
          onDelete={handleDelete}
          onReport={handleReport}
        />
      );
  }
}