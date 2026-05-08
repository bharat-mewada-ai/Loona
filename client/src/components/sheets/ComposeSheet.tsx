import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  TextInput, ScrollView, Switch, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, getColors, vibeStyle } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useCreatePost } from '../../hooks/usePosts';
import { CAMPUSES_LIST, detectVibe, checkContent, POST_TYPES } from '../../constants';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import type { Campus } from '../../types';

const COMPOSE_TITLES: Record<string, string> = {
  thought: 'Start a discussion 💬',
  confess: 'Anonymous confession 🕳️',
  events:  'Post an event 📅',
  bhandara: 'Post a bhandara 🍛',
  place:   'Placement discussion 💼',
};

type VibeStyleResult = { label: string; color: string; bg: string } | null;

export default function ComposeSheet() {
  const { showComposeSheet, closeComposeSheet, composeType, setComposeType, isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const { user } = useAuthStore();
  const { mutate: createPost, isPending } = useCreatePost();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // Local URI for immediate preview; cdnUrl is what we send to the backend
  const [imageUri, setImageUri] = useState('');      // device local path
  const [cdnUrl, setCdnUrl] = useState('');          // cloudinary https URL
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


  useEffect(() => {
    if (showComposeSheet) {
      (async () => {
        if (Platform.OS === 'web') return;
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
        }
      })();
    }
  }, [showComposeSheet]);

  const handleImageSelected = async (uri: string) => {
    setTempImageUri(uri);
    setShowConfirmModal(true);
  };

  const confirmImage = async () => {
    const localUri = tempImageUri;
    setImageUri(localUri);
    setCdnUrl('');
    setImageUploading(true);
    setShowConfirmModal(false);
    try {
      const { url } = await uploadToCloudinary(localUri);
      setCdnUrl(url);
    } catch (err: any) {
      Alert.alert('Upload Failed', 'Could not upload image.');
      setImageUri('');
    } finally {
      setImageUploading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) handleImageSelected(result.assets[0].uri);
  };

  const takePhoto = async () => {
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
          .replace(/^, |, $/g, '')
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
          // Small delay before opening time picker on Android
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
    if (!title.trim()) {
      Alert.alert('Wait!', 'Please enter a title.');
      return;
    }
    if (guard.level === 'bad') {
      Alert.alert('Blocked', 'Your post contains banned content.');
      return;
    }

    const cleanOptions = isPoll ? pollOptions.map(o => o.trim()).filter(o => o.length > 0) : [];
    
    if (isPoll && cleanOptions.length < 2) {
      Alert.alert('Incomplete Poll', 'Please provide at least 2 options.');
      return;
    }

    const isEvent = composeType === 'events' || composeType === 'bhandara';

    createPost(
      {
        title: title.trim(),
        body: body.trim() || undefined,
        image: cdnUrl || undefined,
        eventDate: isEvent && dateSet ? eventDate.toISOString() : undefined,
        eventLocation: isEvent ? eventLocation.trim() || undefined : undefined,
        campus: user?.campus || 'all',
        type: composeType,
        burnAfter24h: burn,
        isPoll,
        pollOptions: isPoll ? cleanOptions : undefined,
        location: userLocation ? { type: 'Point', coordinates: [userLocation.longitude, userLocation.latitude] } : undefined,
      },
      {
        onSuccess: () => {
          setTitle(''); setBody(''); setImageUri(''); setCdnUrl(''); setDateSet(false); setBurn(false); setIsPoll(false); setPollOptions(['', '']);
          setEventLocation('');
          closeComposeSheet();
        },
        onError: (error: any) => {
          const msg = error?.response?.data?.error || error?.message || 'Something went wrong';
          Alert.alert('Post Failed', msg);
        }
      }
    );
  }, [title, body, cdnUrl, composeType, dateSet, eventDate, eventLocation, user, burn, isPoll, pollOptions, createPost, closeComposeSheet, userLocation, guard.level]);

  const handleClose = () => {
    setTitle(''); setBody(''); setImageUri(''); setCdnUrl(''); setDateSet(false); setBurn(false); setIsPoll(false);
    closeComposeSheet();
  };

  return (
    <Modal visible={showComposeSheet} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={s.overlay} onPress={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <Pressable style={[s.sheet, { backgroundColor: themeColors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.handle} />
            
            <View style={s.sHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
                  <Text style={{ color: themeColors.txt3, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
                <Text style={[s.title, { color: themeColors.txt }]}>New Post</Text>
              </View>
              
              <TouchableOpacity 
                style={[s.topPostBtn, { backgroundColor: themeColors.ogi }, (isPending || !title.trim()) && { opacity: 0.6 }]} 
                onPress={handleSubmit} 
                disabled={isPending || !title.trim()}
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {(composeType === 'events' || composeType === 'bhandara') && (
                <View style={[s.eventFields, { backgroundColor: themeColors.card2, padding: 12, borderRadius: 16, marginBottom: 16 }]}>
                  <TouchableOpacity 
                    style={[s.eInp, { backgroundColor: themeColors.bg, borderColor: themeColors.bdr }]} 
                    onPress={handleOpenPicker}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.card3 || '#1A1A1A', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>📅</Text>
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
                      <Text style={{ fontSize: 16 }}>📍</Text>
                      <TextInput style={{ flex: 1, color: themeColors.txt, padding: 0 }} placeholder="Location" placeholderTextColor={themeColors.txt3} value={eventLocation} onChangeText={setEventLocation} />
                    </View>
                    <TouchableOpacity style={[s.locBtn, { borderColor: themeColors.bdr }]} onPress={handleGetLocation}>
                      {locationLoading ? <ActivityIndicator size="small" color={themeColors.ogi} /> : <Text style={{ fontSize: 18 }}>🎯</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TextInput
                style={[s.ta, { color: themeColors.txt }]}
                placeholder={isPoll ? "Ask a question for your poll..." : "What's happening? kuch bhi likho..."}
                placeholderTextColor={themeColors.txt3}
                value={title}
                onChangeText={setTitle}
                multiline
                autoFocus
              />

              {imageUri && (
                <View style={s.previewContainer}>
                  <Image source={{ uri: imageUri }} style={s.preview} />
                  {imageUploading && <View style={s.upOverlay}><ActivityIndicator color="#fff" /></View>}
                  <TouchableOpacity style={s.removeBtn} onPress={() => setImageUri('')}><Text style={{ color: '#fff' }}>✕</Text></TouchableOpacity>
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

              <View style={s.chipRow}>
                {POST_TYPES.map(t => (
                  <TouchableOpacity 
                    key={t.value}
                    style={[s.chip, { backgroundColor: composeType === t.value ? themeColors.ogi : themeColors.card2 }]} 
                    onPress={() => setComposeType(t.value as any)}
                  >
                    <Text style={[s.chipTxt, { color: composeType === t.value ? '#FFF' : themeColors.txt }]}>{t.icon} {t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.actionRow}>
                <TouchableOpacity style={s.aBtn} onPress={pickImage}><Text style={s.aIcon}>🖼️</Text></TouchableOpacity>
                <TouchableOpacity style={s.aBtn} onPress={takePhoto}><Text style={s.aIcon}>📸</Text></TouchableOpacity>
                <TouchableOpacity style={s.aBtn} onPress={() => setBurn(!burn)}>
                  <Text style={[s.aIcon, burn && { color: themeColors.ogi }]}>{burn ? '🔥' : '♾️'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.aBtn} onPress={() => {
                  const newState = !isPoll;
                  setIsPoll(newState);
                  if (!newState) setPollOptions(['', '']);
                }}>
                  <Text style={[s.aIcon, isPoll && { color: themeColors.ogi }]}>📊</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>

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
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, minHeight: '70%' },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontFamily: 'Syne_700Bold' },
  closeBtn: { padding: 4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  avWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  authorTxt: { fontSize: 13 },
  ta: { fontSize: 18, lineHeight: 26, minHeight: 100, textAlignVertical: 'top', fontFamily: 'PlusJakartaSans_400Regular' },
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
  actionRow: { flexDirection: 'row', gap: 20, marginTop: 20, paddingBottom: 20 },
  aBtn: { padding: 4 },
  aIcon: { fontSize: 20 },
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
});
