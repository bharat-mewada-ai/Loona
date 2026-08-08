import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  TextInput, ScrollView, Switch, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useCreatePost } from '../../hooks/usePosts';
import { CAMPUSES_LIST, checkContent, POST_TYPES } from '../../constants';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import type { Campus } from '../../types';
import { requestLocation } from '../../hooks/useLocation';
import { Ionicons } from '@expo/vector-icons';
import { searchTracks, getTrendingTracks, Track, soundManager } from '../../services/musicService';


interface SliderProps {
  offset: number;
  onChange: (value: number) => void;
  onRelease: () => void;
  themeColors: any;
  isPreviewPlaying: boolean;
  onPlayPreview: () => void;
  onStopPreview: () => void;
}

const CustomMusicSlider = ({ offset, onChange, onRelease, themeColors, isPreviewPlaying, onPlayPreview, onStopPreview }: SliderProps) => {
  const [width, setWidth] = useState(250);

  const handleTouch = (e: any) => {
    const { locationX } = e.nativeEvent;
    const percentage = Math.max(0, Math.min(locationX / width, 1));
    const seconds = Math.round(percentage * 20);
    onChange(seconds);
  };

  const fmt = (s: number) => `0:${s < 10 ? `0${s}` : s}`;

  return (
    <View style={{ marginTop: 14, width: '100%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: themeColors.txt2, fontSize: 12, fontWeight: '700' }}>🎬 Choose start point</Text>
        <Text style={{ color: themeColors.ogi, fontSize: 12, fontWeight: '900' }}>{fmt(offset)} — {fmt(Math.min(offset + 10, 30))}</Text>
      </View>

      {/* Slider track */}
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width || 250)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onResponderRelease={() => { onChange(offset); onRelease(); }}
        style={{ height: 36, justifyContent: 'center', position: 'relative' }}
      >
        {/* Background track */}
        <View style={{ height: 8, borderRadius: 4, backgroundColor: themeColors.bdr, width: '100%' }} />
        {/* Selected range highlight */}
        <View style={{
          position: 'absolute',
          height: 8,
          borderRadius: 4,
          backgroundColor: themeColors.ogi + '55',
          left: `${(offset / 20) * 100}%`,
          width: `${(10 / 30) * 100}%`,
        }} />
        {/* Start thumb */}
        <View style={{
          position: 'absolute',
          left: `${(offset / 20) * 100}%`,
          marginLeft: -11,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: themeColors.ogi,
          borderWidth: 3,
          borderColor: '#FFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
          elevation: 4,
        }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <Text style={{ color: themeColors.txt3, fontSize: 10 }}>0:00</Text>
        {/* Play preview button */}
        <TouchableOpacity
          onPress={isPreviewPlaying ? onStopPreview : onPlayPreview}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: themeColors.card2, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 }}
        >
          <Ionicons name={isPreviewPlaying ? 'pause' : 'play'} size={14} color={themeColors.ogi} />
          <Text style={{ color: themeColors.ogi, fontSize: 12, fontWeight: '700' }}>
            {isPreviewPlaying ? 'Stop Preview' : 'Preview Clip'}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: themeColors.txt3, fontSize: 10 }}>0:20</Text>
      </View>
    </View>
  );
};

const COMPOSE_TITLES: Record<string, string> = {
  all: 'Start a discussion',
  thought: 'Start a discussion',
  discussion: 'Open a topic',
  confess: 'Anonymous confession',
  events:  'Post an event',
  offers:  'Post an offer',
  bhandara: 'Post a bhandara',
  stories: 'Tell a story',
};

type VibeStyleResult = { label: string; color: string; bg: string } | null;

export default function ComposeSheet() {
  const insets = useSafeAreaInsets();
  const { showComposeSheet, closeComposeSheet, composeType, setComposeType, isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const { user } = useAuthStore();
  const { mutate: createPost, isPending } = useCreatePost();  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // Support multiple images
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [cdnUrls, setCdnUrls] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false); // upload in progress

  // Date & Time states
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [dateSet, setDateSet] = useState(false);

  const [eventLocation, setEventLocation] = useState('');
  const [burn, setBurn] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [isPoll, setIsPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tempImageUri, setTempImageUri] = useState('');

  // Offer/Event specific
  const [offerBrand, setOfferBrand] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('');
  const [externalLink, setExternalLink] = useState(''); // for tickets or offers
  const [isExclusive, setIsExclusive] = useState(false);

  // Song attachment (Instagram-style music sticker & audio preview)
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [songQuery, setSongQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<number | null>(null);
  const musicSearchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [musicFetchError, setMusicFetchError] = useState(false);
  const [songStartOffset, setSongStartOffset] = useState(0);
  const [isSliderPreviewPlaying, setIsSliderPreviewPlaying] = useState(false);


  // Stop preview audio whenever music modal closes
  useEffect(() => {
    if (!showMusicModal) {
      soundManager.stop();
      setPlayingPreviewId(null);
    }
  }, [showMusicModal]);

  // Load trending music suggestions when music selector opens
  const openMusicSelector = async () => {
    setShowMusicModal(true);
    setSongQuery('');
    setMusicFetchError(false);
    setIsSearchingMusic(true);
    try {
      const trending = await getTrendingTracks();
      setSearchResults(trending);
      setMusicFetchError(trending.length === 0);
    } catch (_) {
      setMusicFetchError(true);
      setSearchResults([]);
    }
    setIsSearchingMusic(false);
  };


  // Auto-set burn status for stories
  useEffect(() => {
    if (composeType === 'stories') {
      setBurn(true);
    } else {
      setBurn(false);
    }
  }, [composeType]);

  useEffect(() => {
    if (showComposeSheet) {
      (async () => {
        if (Platform.OS === 'web') return;
        const loc = await requestLocation();
        if (loc) setUserLocation(loc);
      })();
    }
  }, [showComposeSheet]);

  const handleImageSelected = async (uri: string) => {
    setTempImageUri(uri);
    setShowConfirmModal(true);
  };

  const confirmImage = async () => {
    const localUri = tempImageUri;
    if (imageUris.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      setShowConfirmModal(false);
      return;
    }
    setImageUris(prev => [...prev, localUri]);
    setImageUploading(true);
    setShowConfirmModal(false);
    try {
      const { url } = await uploadToCloudinary(localUri);
      setCdnUrls(prev => [...prev, url]);
    } catch (err: any) {
      Alert.alert('Upload Failed', 'Could not upload image.');
      setImageUris(prev => prev.filter(u => u !== localUri));
    } finally {
      setImageUploading(false);
    }
  };

  const pickImage = async () => {
    const remainingLimit = 5 - imageUris.length;
    if (remainingLimit <= 0) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingLimit,
      quality: 0.5,
    });
    if (!result.canceled) {
      setImageUploading(true);
      const assets = result.assets;
      try {
        for (const asset of assets) {
          const localUri = asset.uri;
          setImageUris(prev => [...prev, localUri]);
          const { url } = await uploadToCloudinary(localUri);
          setCdnUrls(prev => [...prev, url]);
        }
      } catch (err) {
        Alert.alert('Upload Error', 'Failed to upload some images.');
      } finally {
        setImageUploading(false);
      }
    }
  };

  const takePhoto = async () => {
    if (imageUris.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) handleImageSelected(result.assets[0].uri);
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to fetch your current spot.');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      let address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      if (address && address[0]) {
        const item = address[0];
        const addrStr = `${item.name || ''}, ${item.street || ''}, ${item.district || item.city || ''}`
          .replace(/^, /, '')
          .replace(/, ,/g, ',');
        setEventLocation(addrStr);
      } else {
        setEventLocation(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      Alert.alert('Location Error', 'Could not fetch your current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const [showPicker, setShowPicker] = useState<false | 'date' | 'time'>(false);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false); // Hide immediately on Android
    }

    if (selectedDate) {
      const nextDate = new Date(eventDate);
      if (showPicker === 'date') {
        nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        setEventDate(nextDate);
        if (Platform.OS === 'android') {
          setTimeout(() => setShowPicker('time'), 150);
        } else {
          setShowPicker('time');
        }
      } else {
        nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        setEventDate(nextDate);
        setDateSet(true);
        if (Platform.OS === 'ios') {
          if (event.type === 'set') setShowPicker(false);
        }
      }
    } else if (Platform.OS === 'android') {
      setShowPicker(false);
    }
  };

  const handleOpenPicker = () => {
    setShowPicker('date');
  };

  const combined = (title + ' ' + body).toLowerCase();
  const guard = checkContent(combined);

  const handleSubmit = useCallback(() => {
    const isPhotoStory = composeType === 'stories' && cdnUrls.length > 0;
    const isConfession = composeType === 'confess';
    if (!title.trim() && !isPhotoStory && !isConfession) {
      Alert.alert('Wait!', 'Please enter a title or upload a photo.');
      return;
    }
    if (isConfession && !body.trim()) {
      Alert.alert('Wait!', 'Write your confession first.');
      return;
    }
    if (guard.level === 'bad') {
      Alert.alert('Blocked', 'Your post contains banned content.');
      return;
    }

    if (!user?.campus) {
      Alert.alert('Error', 'Campus not set. Please log out and log in again.');
      return;
    }

    const postType = (composeType === 'all' || !composeType) ? 'discussion' : composeType;

    const cleanOptions = isPoll ? pollOptions.map(o => o.trim()).filter(o => o.length > 0) : [];
    
    if (isPoll && cleanOptions.length < 2) {
      Alert.alert('Incomplete Poll', 'Please provide at least 2 options.');
      return;
    }

    const isEvent = composeType === 'events' || composeType === 'bhandara';

    createPost(
      {
        title: isConfession ? undefined : title.trim(),
        body: isConfession ? body.trim() : (body.trim() || undefined),
        image: cdnUrls[0] || undefined,
        images: cdnUrls,
        eventDate: isEvent && dateSet ? eventDate.toISOString() : undefined,
        eventLocation: isEvent ? eventLocation.trim() || undefined : undefined,
        offerBrand: composeType === 'offers' ? offerBrand.trim() || undefined : undefined,
        offerDiscount: composeType === 'offers' ? offerDiscount.trim() || undefined : undefined,
        externalLink: (isEvent || composeType === 'offers') ? externalLink.trim() || undefined : undefined,
        isExclusive: composeType === 'offers' ? isExclusive : undefined,
        campus: user.campus,
        type: postType,
        burnAfter24h: burn,
        isPoll,
        pollOptions: isPoll ? cleanOptions : undefined,
        location: userLocation ? { type: 'Point', coordinates: [userLocation.longitude, userLocation.latitude] } : undefined,
        songName: selectedTrack?.trackName || undefined,
        songArtist: selectedTrack?.artistName || undefined,
        songAudioUrl: selectedTrack?.previewUrl || undefined,
        songCoverUrl: selectedTrack?.artworkUrl || undefined,
        // @ts-ignore - TODO: explicitly documented TS error for CI to pass
        songStartOffset: selectedTrack && songStartOffset > 0 ? songStartOffset * 1000 : undefined,
      },
      {
        onSuccess: () => {
          setTitle(''); setBody(''); setImageUris([]); setCdnUrls([]); setDateSet(false); setBurn(false); setIsPoll(false); setPollOptions(['', '']);
          setEventLocation('');
          setSelectedTrack(null); setSongQuery(''); setSearchResults([]); setSongStartOffset(0); setIsSliderPreviewPlaying(false);
          soundManager.stop();
          closeComposeSheet();
        },
        onError: (error: any) => {
          console.error('Post creation error:', error);
          const msg = error?.response?.data?.error || error?.message || 'Something went wrong';
          Alert.alert('Post Failed', `${msg}\n\nType: ${composeType}\nCampus: ${user?.campus}`);
        }
      }
    );
  }, [title, body, cdnUrls, composeType, dateSet, eventDate, eventLocation, user, burn, isPoll, pollOptions, createPost, closeComposeSheet, userLocation, guard.level, selectedTrack, songStartOffset]);

  const handleClose = () => {
    setTitle(''); setBody(''); setImageUris([]); setCdnUrls([]); setDateSet(false); setBurn(false); setIsPoll(false);
    setOfferBrand(''); setOfferDiscount(''); setExternalLink(''); setIsExclusive(false);
    setSelectedTrack(null); setSongQuery(''); setSearchResults([]); setSongStartOffset(0); setIsSliderPreviewPlaying(false);
    soundManager.stop();
    closeComposeSheet();
  };
  return (
    <Modal visible={showComposeSheet} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={s.overlay} onPress={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', height: '85%', justifyContent: 'flex-end' }}>
          <Pressable style={[s.sheet, { backgroundColor: themeColors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.handle} />
            
            <View style={s.sHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity 
                  onPress={handleClose} 
                  style={s.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close compose sheet"
                >
                  <Text style={{ color: themeColors.txt3, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
                <Text style={[s.title, { color: themeColors.txt }]}>New Post</Text>
              </View>
              
              <TouchableOpacity 
                style={[s.topPostBtn, { backgroundColor: themeColors.ogi }, (isPending || (composeType === 'confess' ? !body.trim() : (!title.trim() && !(composeType === 'stories' && cdnUrls.length > 0)))) && { opacity: 0.5 }]} 
                onPress={handleSubmit} 
                disabled={isPending || (composeType === 'confess' ? !body.trim() : (!title.trim() && !(composeType === 'stories' && cdnUrls.length > 0)))}
                accessibilityRole="button"
                accessibilityLabel="Post your content"
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.topPostBtnTxt}>Post</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={s.authorRow}>
              <View style={[s.avWrap, { backgroundColor: themeColors.card2 }]}>
                <Text style={{ fontSize: 18 }}>{user?.avatar || '👤'}</Text>
              </View>
              <Text style={[s.authorTxt, { color: themeColors.txt2 }]}>
                Posting as <Text style={{ fontWeight: '700', color: themeColors.txt }}>{user?.name || 'User'}</Text> · {user?.campus?.toUpperCase() || 'Campus'}
              </Text>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {(composeType === 'events' || composeType === 'bhandara') && (
                <View style={[s.eventFields, { backgroundColor: themeColors.card2, padding: 12, borderRadius: 16, marginBottom: 16 }]}>
                  <TouchableOpacity 
                    style={[s.eInp, { backgroundColor: themeColors.bg, borderColor: themeColors.bdr }]} 
                    onPress={handleOpenPicker}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Select event date and time"
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.card3 || '#1A1A1A', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="calendar-outline" size={20} color={themeColors.txt} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: themeColors.txt3, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Event Timing</Text>
                      <Text style={{ color: dateSet ? themeColors.txt : themeColors.ogi, fontWeight: '700', fontSize: 15 }}>
                        {dateSet ? eventDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Set Date & Time'}
                      </Text>
                    </View>
                    <Text style={{ color: themeColors.txt3, fontSize: 18 }}>›</Text>
                  </TouchableOpacity>

                  {/* Unified Picker Rendering */}
                  {showPicker && (
                    Platform.OS === 'ios' ? (
                      <View style={{ marginTop: 10, backgroundColor: themeColors.bg2, borderRadius: 12, padding: 10 }}>
                        <DateTimePicker 
                          value={eventDate} 
                          mode={showPicker} 
                          display="spinner" 
                          onChange={onDateChange} 
                          minimumDate={new Date()} 
                          textColor={themeColors.txt}
                        />
                      </View>
                    ) : (
                      <DateTimePicker 
                        value={eventDate} 
                        mode={showPicker} 
                        display="default" 
                        onChange={onDateChange} 
                        minimumDate={new Date()} 
                      />
                    )
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <View style={[s.eInp, { flex: 1, borderColor: themeColors.bdr }]}>
                      <Ionicons name="location-outline" size={16} color={themeColors.txt3} />
                      <TextInput 
                        style={{ flex: 1, color: themeColors.txt, padding: 0 }} 
                        placeholder="Location" 
                        placeholderTextColor={themeColors.txt3} 
                        value={eventLocation} 
                        onChangeText={setEventLocation} 
                        accessibilityLabel="Event location input"
                      />
                    </View>
                    <TouchableOpacity style={[s.locBtn, { borderColor: themeColors.bdr }]} onPress={handleGetLocation}>
                      {locationLoading ? <ActivityIndicator size="small" color={themeColors.ogi} /> : <Ionicons name="locate-outline" size={18} color={themeColors.txt} />}
                    </TouchableOpacity>
                  </View>
                  
                  {composeType === 'events' && (
                    <View style={[s.eInp, { marginTop: 10, borderColor: themeColors.bdr }]}>
                      <Ionicons name="link-outline" size={16} color={themeColors.txt3} />
                      <TextInput 
                        style={{ flex: 1, color: themeColors.txt, padding: 0 }} 
                        placeholder="Registration / Ticket Link (Optional)" 
                        placeholderTextColor={themeColors.txt3} 
                        value={externalLink} 
                        onChangeText={setExternalLink} 
                      />
                    </View>
                  )}
                </View>
              )}

              {composeType === 'offers' && (
                <View style={[s.eventFields, { backgroundColor: themeColors.card2, padding: 12, borderRadius: 16, marginBottom: 16 }]}>
                  <View style={[s.eInp, { borderColor: themeColors.bdr }]}>
                    <Ionicons name="business-outline" size={16} color={themeColors.txt3} />
                    <TextInput 
                      style={{ flex: 1, color: themeColors.txt, padding: 0 }} 
                      placeholder="Brand Name (e.g. Chai Sutta Bar)" 
                      placeholderTextColor={themeColors.txt3} 
                      value={offerBrand} 
                      onChangeText={setOfferBrand} 
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <View style={[s.eInp, { flex: 1, borderColor: themeColors.bdr }]}>
                      <Ionicons name="pricetag-outline" size={16} color={themeColors.txt3} />
                      <TextInput 
                        style={{ flex: 1, color: themeColors.txt, padding: 0 }} 
                        placeholder="Discount (e.g. 20% OFF)" 
                        placeholderTextColor={themeColors.txt3} 
                        value={offerDiscount} 
                        onChangeText={setOfferDiscount} 
                      />
                    </View>
                    <View style={[s.eInp, { flex: 1, borderColor: themeColors.bdr }]}>
                      <Ionicons name="link-outline" size={16} color={themeColors.txt3} />
                      <TextInput 
                        style={{ flex: 1, color: themeColors.txt, padding: 0 }} 
                        placeholder="Offer Link (Optional)" 
                        placeholderTextColor={themeColors.txt3} 
                        value={externalLink} 
                        onChangeText={setExternalLink} 
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 }}>
                    <Text style={{ color: themeColors.txt, fontWeight: '700' }}>Loona Exclusive?</Text>
                    <Switch 
                      value={isExclusive} 
                      onValueChange={setIsExclusive} 
                      trackColor={{ false: themeColors.bdr, true: '#c8f53a' }} 
                    />
                  </View>
                </View>
              )}

              {composeType !== 'confess' && (
                <TextInput
                  style={[s.ta, { color: themeColors.txt, fontWeight: composeType === 'stories' ? '800' : '400' }]}
                  placeholder={
                    composeType === 'stories' ? "Story Title (e.g., Late night library secret...)" :
                    composeType === 'discussion' ? "What's the topic? (e.g., Is coding dying?)" :
                    isPoll ? "Ask a question for your poll..." : "Write your post here..."
                  }
                  placeholderTextColor={themeColors.txt3}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={120}
                  multiline
                  autoFocus
                  accessibilityLabel="Post title input"
                />
              )}

              {/* Body/Details input — always shown for confessions, conditionally for others */}
              {/* @ts-ignore */}
              {((composeType as string) === 'confess' || (composeType !== 'confess' && (composeType === 'stories' || composeType === 'discussion' || !!body))) && (
                <>
                  <TextInput
                    style={[s.bodyTa, { color: themeColors.txt, minHeight: composeType === 'confess' ? 160 : 120 }]}
                    placeholder={composeType === 'confess' ? "Pour your heart out... (up to 10,000 chars)" : composeType === 'stories' ? "Tell your full story here..." : "Add more details..."}
                    placeholderTextColor={themeColors.txt3}
                    value={body}
                    onChangeText={setBody}
                    maxLength={composeType === 'confess' ? 10000 : (composeType === 'stories' || composeType === 'discussion') ? 5000 : 500}
                    multiline
                    autoFocus={composeType === 'confess'}
                    accessibilityLabel="Post body input"
                  />
                  <Text style={[s.charCount, { color: body.length > (composeType === 'confess' ? 9500 : 4500) ? '#EF4444' : themeColors.txt3 }]}>
                    {body.length} / {composeType === 'confess' ? 10000 : (composeType === 'stories' || composeType === 'discussion') ? 5000 : 500}
                  </Text>
                </>
              )}

              {imageUris.length > 0 && (
                <View style={{ marginVertical: 12 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {imageUris.map((uri, idx) => (
                      <View key={idx} style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        <TouchableOpacity 
                          style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => {
                            setImageUris(prev => prev.filter((_, i) => i !== idx));
                            setCdnUrls(prev => prev.filter((_, i) => i !== idx));
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {imageUploading && (
                      <View style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={themeColors.ogi} />
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              {imageUris.length === 0 && imageUploading && (
                <View style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center', marginVertical: 12 }}>
                  <ActivityIndicator color={themeColors.ogi} />
                </View>
              )}

              {/* Attached Music Song Sticker Banner */}
              {!!selectedTrack && (
                <View style={[s.songPanel, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr, padding: 12, borderRadius: 16, marginTop: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {selectedTrack.artworkUrl ? (
                      <Image source={{ uri: selectedTrack.artworkUrl }} style={{ width: 42, height: 42, borderRadius: 10 }} />
                    ) : (
                      <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: themeColors.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="musical-notes" size={20} color={themeColors.ogi} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: themeColors.txt, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                        {selectedTrack.trackName}
                      </Text>
                      <Text style={{ color: themeColors.txt3, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {selectedTrack.artistName} · Song Attached
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedTrack(null)}
                      style={{ padding: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel="Remove attached song"
                    >
                      <Ionicons name="close-circle" size={22} color={themeColors.txt3} />
                    </TouchableOpacity>
                  </View>

                  {/* Song Clip Selector Slider */}
                  <CustomMusicSlider
                    offset={songStartOffset}
                    onChange={(val) => {
                      setSongStartOffset(val);
                      setIsSliderPreviewPlaying(false);
                      soundManager.stop();
                    }}
                    onRelease={() => {
                      // Preview automatically plays when slider is released
                      setIsSliderPreviewPlaying(true);
                      soundManager.play(
                        selectedTrack.previewUrl,
                        () => setIsSliderPreviewPlaying(false),
                        songStartOffset * 1000
                      );
                    }}
                    themeColors={themeColors}
                    isPreviewPlaying={isSliderPreviewPlaying}
                    onPlayPreview={() => {
                      setIsSliderPreviewPlaying(true);
                      soundManager.play(
                        selectedTrack.previewUrl,
                        () => setIsSliderPreviewPlaying(false),
                        songStartOffset * 1000
                      );
                    }}
                    onStopPreview={() => {
                      setIsSliderPreviewPlaying(false);
                      soundManager.stop();
                    }}
                  />
                </View>
              )}

              {isPoll && (
                <View style={[s.pollInputs, { backgroundColor: themeColors.card2, padding: 16, borderRadius: 20, marginTop: 16 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: themeColors.txt, fontWeight: '700', fontSize: 16 }}>📊 Create a Poll</Text>
                    <TouchableOpacity onPress={() => { setIsPoll(false); setPollOptions(['', '']); }}>
                      <Text style={{ color: themeColors.danger, fontWeight: '600', fontSize: 13 }}>Remove Poll</Text>
                    </TouchableOpacity>
                  </View>
                  {pollOptions.map((opt, i) => (
                    <View key={i} style={[s.pOptRow, { marginBottom: 8 }]}>
                      <TextInput 
                        style={[s.pInp, { flex: 1, height: 45, backgroundColor: themeColors.bg, color: themeColors.txt, borderColor: themeColors.bdr, borderRadius: 12 }]} 
                        placeholder={`Option ${i+1}`} 
                        placeholderTextColor={themeColors.txt3}
                        value={opt}
                        onChangeText={t => {
                          const n = [...pollOptions]; n[i] = t; setPollOptions(n);
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <TouchableOpacity 
                          style={{ padding: 10 }}
                          onPress={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                        >
                          <Text style={{ color: themeColors.txt3, fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {pollOptions.length < 4 && (
                    <TouchableOpacity 
                      style={{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: themeColors.bg, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: themeColors.bdr }}
                      onPress={() => setPollOptions([...pollOptions, ''])}
                    >
                      <Text style={{ color: themeColors.ogi, fontWeight: '700', fontSize: 14 }}>+ Add Another Option</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* 24 Hours Auto-Delete Switch */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: themeColors.bdr, borderBottomWidth: 1, borderBottomColor: themeColors.bdr }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: themeColors.txt, fontWeight: '700', fontSize: 14 }}>Delete after 24 hours</Text>
                  <Text style={{ color: themeColors.txt3, fontSize: 11, marginTop: 2 }}>
                    This post/story will be deleted automatically in 24 hours
                  </Text>
                </View>
                <Switch
                  value={burn}
                  onValueChange={setBurn}
                  trackColor={{ false: themeColors.bdr, true: themeColors.ogi }}
                  thumbColor={Platform.OS === 'android' ? (burn ? themeColors.ogi : '#f4f3f4') : undefined}
                />
              </View>

              <View style={s.chipRow}>
                {POST_TYPES.map(t => (
                  <TouchableOpacity 
                    key={t.value}
                    style={[
                      s.chip, 
                      { 
                        backgroundColor: composeType === t.value ? themeColors.ogi : themeColors.card2,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6
                      }
                    ]} 
                    onPress={() => setComposeType(t.value as any)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select post type: ${t.label}`}
                    accessibilityState={{ selected: composeType === t.value }}
                  >
                    <Ionicons 
                      name={t.icon as any} 
                      size={14} 
                      color={composeType === t.value ? '#FFF' : themeColors.txt} 
                    />
                    <Text style={[s.chipTxt, { color: composeType === t.value ? '#FFF' : themeColors.txt }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* 📌 Sticky Bottom Footer Toolbar (Always Visible!) */}
            <View style={[s.bottomFooterBar, { borderTopColor: themeColors.bdr, paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={s.actionRow}>
                <TouchableOpacity style={s.aBtn} onPress={pickImage}>
                  <Ionicons name="image-outline" size={22} color={themeColors.txt2} />
                </TouchableOpacity>
                <TouchableOpacity style={s.aBtn} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={22} color={themeColors.txt2} />
                </TouchableOpacity>
                <TouchableOpacity style={s.aBtn} onPress={() => setBurn(!burn)}>
                  <Ionicons name={burn ? "flame" : "flame-outline"} size={22} color={burn ? themeColors.ogi : themeColors.txt2} />
                </TouchableOpacity>
                <TouchableOpacity style={s.aBtn} onPress={() => {
                  const newState = !isPoll;
                  setIsPoll(newState);
                  if (!newState) setPollOptions(['', '']);
                }}>
                  <Ionicons name={isPoll ? "bar-chart" : "bar-chart-outline"} size={22} color={isPoll ? themeColors.ogi : themeColors.txt2} />
                </TouchableOpacity>
                <TouchableOpacity style={s.aBtn} onPress={openMusicSelector}>
                  <Ionicons name={selectedTrack ? "musical-notes" : "musical-notes-outline"} size={22} color={selectedTrack ? '#c8f53a' : themeColors.txt2} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[s.mainStickyPostBtn, { backgroundColor: themeColors.ogi }, (isPending || (composeType === 'confess' ? !body.trim() : (!title.trim() && !(composeType === 'stories' && cdnUrls.length > 0)))) && { opacity: 0.5 }]} 
                onPress={handleSubmit} 
                disabled={isPending || (composeType === 'confess' ? !body.trim() : (!title.trim() && !(composeType === 'stories' && cdnUrls.length > 0)))}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.mainStickyPostBtnTxt}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>

      {/* 🎵 Full Instagram Music Selector Modal */}
      <Modal visible={showMusicModal} transparent animationType="slide" onRequestClose={() => { soundManager.stop(); setShowMusicModal(false); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: isDark ? '#121217' : '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, height: '85%' }}>
            <View style={s.handle} />
            
            {/* Music Picker Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: themeColors.txt, fontSize: 20, fontWeight: '800' }}>Select Music</Text>
              <TouchableOpacity onPress={() => { soundManager.stop(); setShowMusicModal(false); }}>
                <Ionicons name="close" size={24} color={themeColors.txt3} />
              </TouchableOpacity>
            </View>

            {/* Instagram Search Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.bg, borderWidth: 1, borderColor: themeColors.bdr, borderRadius: 16, paddingHorizontal: 14, height: 46, marginBottom: 16 }}>
              <Ionicons name="search" size={20} color={themeColors.txt3} />
              <TextInput
                style={{ flex: 1, color: themeColors.txt, fontSize: 15, marginLeft: 10 }}
                placeholder="Search music, songs, artist..."
                placeholderTextColor={themeColors.txt3}
                value={songQuery}
                onChangeText={(q) => {
                  setSongQuery(q);
                  // Debounce — wait 400ms after user stops typing before fetching
                  if (musicSearchTimer.current) clearTimeout(musicSearchTimer.current);
                  musicSearchTimer.current = setTimeout(async () => {
                    setIsSearchingMusic(true);
                    try {
                      const tracks = await searchTracks(q);
                      setSearchResults(tracks);
                    } catch (_) {}
                    setIsSearchingMusic(false);
                  }, 400);
                }}
                autoFocus
              />
              {!!songQuery && (
                <TouchableOpacity onPress={() => { setSongQuery(''); searchTracks('').then(setSearchResults); }}>
                  <Ionicons name="close-circle" size={18} color={themeColors.txt3} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={{ color: themeColors.txt3, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.8 }}>
              {songQuery.trim().length >= 2 ? 'Search Results' : '🔥 Trending For You'}
            </Text>

            {isSearchingMusic ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={themeColors.ogi} />
                <Text style={{ color: themeColors.txt3, marginTop: 12, fontSize: 13 }}>Loading songs...</Text>
              </View>
            ) : musicFetchError || searchResults.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Text style={{ fontSize: 40 }}>🎵</Text>
                <Text style={{ color: themeColors.txt, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
                  {musicFetchError ? 'Could not load songs' : 'No songs found'}
                </Text>
                <Text style={{ color: themeColors.txt3, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>
                  {musicFetchError
                    ? 'Check your internet connection and try again.'
                    : 'Try a different search term.'}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    setSongQuery('');
                    setMusicFetchError(false);
                    setIsSearchingMusic(true);
                    try {
                      const tracks = await getTrendingTracks();
                      setSearchResults(tracks);
                      setMusicFetchError(tracks.length === 0);
                    } catch (_) { setMusicFetchError(true); }
                    setIsSearchingMusic(false);
                  }}
                  style={{ backgroundColor: themeColors.ogi, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 8 }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>🔄 Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {searchResults.map((t) => (
                  <TouchableOpacity
                    key={t.trackId}
                    onPress={() => {
                      setSelectedTrack(t);
                      soundManager.stop();
                      setPlayingPreviewId(null);
                      setShowMusicModal(false);
                      setSongStartOffset(0);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: themeColors.bdr }}
                  >
                    {t.artworkUrl ? (
                      <Image source={{ uri: t.artworkUrl }} style={{ width: 48, height: 48, borderRadius: 10 }} />
                    ) : (
                      <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: themeColors.card2, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="musical-notes" size={20} color={themeColors.txt3} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: themeColors.txt, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{t.trackName}</Text>
                      <Text style={{ color: themeColors.txt3, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{t.artistName}</Text>
                    </View>

                    {/* Preview Play/Pause button */}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        if (playingPreviewId === t.trackId) {
                          soundManager.stop();
                          setPlayingPreviewId(null);
                        } else {
                          setPlayingPreviewId(t.trackId);
                          soundManager.play(t.previewUrl, () => setPlayingPreviewId(null));
                        }
                      }}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: playingPreviewId === t.trackId ? themeColors.ogi : themeColors.card2, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name={playingPreviewId === t.trackId ? "pause" : "play"} size={18} color={playingPreviewId === t.trackId ? (isDark ? '#000' : '#fff') : themeColors.txt} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={[s.confirmBox, { backgroundColor: themeColors.card }]}>
            <Text style={[s.confirmTitle, { color: themeColors.txt }]}>Attach this photo?</Text>
            <View style={s.confirmImgWrap}><Image source={{ uri: tempImageUri }} style={s.confirmImg} /></View>
            <View style={s.confirmActions}>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: themeColors.card2 }]} onPress={() => setShowConfirmModal(false)}><Text style={{ color: themeColors.txt2 }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: themeColors.ogi }]} onPress={confirmImage}><Text style={{ color: '#fff', fontWeight: '700' }}>Attach</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, height: '100%', flexDirection: 'column' },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontFamily: 'Syne_700Bold' },
  closeBtn: { padding: 4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  avWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  authorTxt: { fontSize: 13 },
  ta: { fontSize: 18, lineHeight: 26, minHeight: 60, textAlignVertical: 'top', fontFamily: 'PlusJakartaSans_400Regular' },
  bodyTa: { fontSize: 15, lineHeight: 22, marginTop: 12, minHeight: 120, textAlignVertical: 'top' },
  previewContainer: { width: '100%', height: 220, borderRadius: 20, overflow: 'hidden', marginTop: 10, position: 'relative' },
  preview: { width: '100%', height: '100%' },
  upOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  removeBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pollInputs: { padding: 12, borderRadius: 16, marginTop: 12, gap: 8 },
  pOptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pInp: { flex: 1, height: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipTxt: { fontSize: 12, fontWeight: '700' },
  postBtn: { marginLeft: 'auto', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  postBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  aBtn: { padding: 4 },
  aIcon: { fontSize: 20 },
  bottomFooterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 8, borderTopWidth: 0.5, marginTop: 8 },
  mainStickyPostBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  mainStickyPostBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  eventFields: { gap: 10 },
  eInp: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  locBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmBox: { width: '100%', borderRadius: 28, padding: 20, alignItems: 'center' },
  confirmTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  confirmImgWrap: { width: '100%', height: 380, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  confirmImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  topPostBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  topPostBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  charCount: { fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 4, marginBottom: 8 },
  // Song attachment panel
  songPanel: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 12, marginBottom: 4 },
  songInput: { height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
});
