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
  const { showComposeSheet, closeComposeSheet, composeType, isDark } = useUIStore();
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

  // iOS-only state
  const [showIosPicker, setShowIosPicker] = useState<false | 'date' | 'time'>(false);

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



  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      // No base64 — we only need the local URI
    });
    if (result.canceled) return;

    const localUri = result.assets[0].uri;
    setImageUri(localUri); // show preview immediately from device cache
    setCdnUrl('');         // clear any previous CDN url
    setImageUploading(true);

    try {
      const { url } = await uploadToCloudinary(localUri);
      setCdnUrl(url);
    } catch (err: any) {
      Alert.alert(
        'Upload Failed',
        err.message?.includes('not configured')
          ? 'Image uploads are not set up yet. Contact the developer.'
          : 'Could not upload image. Please try again.'
      );
      // Roll back the preview if upload fails
      setImageUri('');
    } finally {
      setImageUploading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });
    if (result.canceled) return;

    const localUri = result.assets[0].uri;
    setImageUri(localUri);
    setCdnUrl('');
    setImageUploading(true);

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

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address) {
        const addrStr = `${address.name || ''}, ${address.street || ''}, ${address.city || ''}`.replace(/^, |, $/g, '').replace(/, ,/g, ',');
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

  // Android: Imperative API (More reliable inside Modals)
  const showAndroidPicker = (mode: 'date' | 'time') => {
    DateTimePickerAndroid.open({
      value: eventDate,
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) {
          const newDate = new Date(eventDate);
          if (mode === 'date') {
            newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setEventDate(newDate);
            // Open time immediately after date
            setTimeout(() => showAndroidPicker('time'), 100);
          } else {
            newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
            setEventDate(newDate);
            setDateSet(true);
          }
        }
      },
      mode,
      is24Hour: true,
      minimumDate: new Date(),
    });
  };

  // iOS: Component-based API
  const onIosChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      const newDate = new Date(eventDate);
      if (showIosPicker === 'date') {
        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        setEventDate(newDate);
        setShowIosPicker('time');
      } else {
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        setEventDate(newDate);
        setDateSet(true);
        if (event.type === 'set') setShowIosPicker(false);
      }
    }
  };

  const handleOpenPicker = () => {
    if (Platform.OS === 'android') {
      showAndroidPicker('date');
    } else {
      setShowIosPicker('date');
    }
  };

  const combined = (title + ' ' + body).toLowerCase();
  const vibe = detectVibe(combined);
  const guard = checkContent(combined);
  const vibeInfo: VibeStyleResult = vibe ? vibeStyle(vibe) : null;

  const guardConfig = ({
    clean: { bg: Colors.okbg, border: Colors.nitbdr, color: Colors.ok,     icon: '✅', msg: 'Looks clean! Posts instantly.' },
    mild:  { bg: Colors.warnbg, border: '#E8C878',  color: Colors.warn,    icon: '⚠️', msg: 'May go into review before posting.' },
    bad:   { bg: Colors.dangerbg, border: Colors.ogibdr, color: Colors.danger, icon: '🚫', msg: 'Blocked — banned content detected.' },
  } as const)[guard.level];



  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      Alert.alert('Wait!', 'Please enter a title.');
      return;
    }
    if (guard.level === 'bad') {
      Alert.alert('Blocked', 'Your post contains banned content.');
      return;
    }
    if (imageUri && !cdnUrl) {
      // Image selected but upload still in progress or failed
      Alert.alert('Hold on', imageUploading ? 'Image is still uploading…' : 'Image upload failed. Remove it or try again.');
      return;
    }

    createPost(
      {
        title: title.trim(),
        body: body.trim() || undefined,
        image: cdnUrl || undefined,          // send CDN URL, never base64
        eventDate: (composeType === 'events' || composeType === 'bhandara') && dateSet ? eventDate.toISOString() : undefined,
        eventLocation: eventLocation.trim() || undefined,
        campus: user?.campus || 'all',
        type: composeType,
        burnAfter24h: burn,
        location: userLocation ? { type: 'Point', coordinates: [userLocation.longitude, userLocation.latitude] } : undefined,
      },
      {
        onSuccess: () => {
          closeComposeSheet();
          setTitle(''); setBody(''); setImageUri(''); setCdnUrl('');
          setDateSet(false); setEventLocation(''); setBurn(false);
        },
        onError: (err: any) => {
          Alert.alert('Post Failed', err.response?.data?.error || 'Something went wrong');
        },
      }
    );
  }, [title, body, cdnUrl, imageUri, imageUploading, eventDate, dateSet, eventLocation, burn, composeType, guard, createPost, closeComposeSheet, user?.campus]);

  const handleClose = () => {
    closeComposeSheet();
    setTitle(''); setBody(''); setImageUri(''); setCdnUrl('');
    setDateSet(false); setEventLocation(''); setBurn(false);
  };

  return (
    <Modal visible={showComposeSheet} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={s.overlay} onPress={handleClose}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%' }}
        >
          <Pressable style={[s.sheet, { backgroundColor: themeColors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.handle} />
            <View style={s.sHeader}>
              <View>
                <Text style={[s.title, { color: themeColors.txt }]}>{COMPOSE_TITLES[composeType] ?? 'New Message'}</Text>
                <View style={[s.toBadge, { backgroundColor: themeColors.card2 }]}>
                  <Text style={[s.toTxt, { color: themeColors.txt3 }]}>To: </Text>
                  <Text style={[s.toLabel, { color: themeColors.ogi }]}>
                    {POST_TYPES.find(p => p.value === composeType)?.label || 'Discussion'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={s.closeCircle}>
                <Text style={{ color: themeColors.txt3, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Title */}
              <TextInput
                style={[s.inp, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr, color: themeColors.txt }]}
                placeholder={composeType === 'confess' ? "What's your secret?" : "Title — what's on your mind?"}
                placeholderTextColor={themeColors.txt3}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />

              {/* Body */}
              <TextInput
                style={[s.inp, s.ta, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr, color: themeColors.txt }]}
                placeholder="More context... (optional)"
                placeholderTextColor={themeColors.txt3}
                value={body}
                onChangeText={setBody}
                multiline
                maxLength={500}
              />

              {/* Image & Camera Picker */}
              <View style={s.mediaBox}>
                <TouchableOpacity
                  style={[s.mediaBtn, { backgroundColor: themeColors.card2 }]}
                  onPress={pickImage}
                  disabled={imageUploading}
                >
                  <Text style={s.mediaIcon}>🖼️</Text>
                  <Text style={[s.mediaTxt, { color: themeColors.txt }]}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.mediaBtn, { backgroundColor: themeColors.card2 }]}
                  onPress={takePhoto}
                  disabled={imageUploading}
                >
                  <Text style={s.mediaIcon}>📸</Text>
                  <Text style={[s.mediaTxt, { color: themeColors.txt }]}>Camera</Text>
                </TouchableOpacity>
                {imageUploading && <ActivityIndicator size="small" color={themeColors.ogi} style={{ marginLeft: 8 }} />}
              </View>

              {imageUri && (
                <View style={[s.previewContainer, { backgroundColor: themeColors.bg2, borderColor: themeColors.bdr }]}>
                  {/* Show local preview immediately; CDN badge appears once uploaded */}
                  <Image source={{ uri: imageUri }} style={s.preview} resizeMode="cover" />
                  {cdnUrl ? (
                    <View style={[s.cdnBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                      <Text style={s.cdnBadgeTxt}>☁️ Uploaded</Text>
                    </View>
                  ) : imageUploading ? (
                    <View style={[s.cdnBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  ) : null}
                  <View style={s.previewOverlay}>
                    <TouchableOpacity
                      style={s.removeImgBtn}
                      onPress={() => { setImageUri(''); setCdnUrl(''); }}
                      disabled={imageUploading}
                    >
                      <Text style={s.removeImgTxt}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Event/Bhandara-specific fields */}
              {(composeType === 'events' || composeType === 'bhandara') && (
                <View style={s.eventFields}>
                  <TouchableOpacity 
                    style={[s.inp, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr, justifyContent: 'center' }]}
                    onPress={handleOpenPicker}
                  >
                    <Text style={{ color: dateSet ? themeColors.txt : themeColors.txt3, fontWeight: '600' }}>
                      {dateSet ? eventDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '📅 Set Event Date & Time'}
                    </Text>
                  </TouchableOpacity>
                  
                  {Platform.OS === 'ios' && showIosPicker && (
                    <DateTimePicker
                      value={eventDate}
                      mode={showIosPicker}
                      display="spinner"
                      onChange={onIosChange}
                      minimumDate={new Date()}
                    />
                  )}

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <TextInput
                      style={[s.inp, { flex: 1, backgroundColor: themeColors.card2, borderColor: themeColors.bdr, color: themeColors.txt, marginBottom: 0 }]}
                      placeholder="Location (e.g. Auditorium)"
                      placeholderTextColor={themeColors.txt3}
                      value={eventLocation}
                      onChangeText={setEventLocation}
                    />
                    <TouchableOpacity 
                      style={[s.locBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}
                      onPress={handleGetLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? <ActivityIndicator size="small" color={themeColors.ogi} /> : <Text style={{ fontSize: 18 }}>📍</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Burn toggle */}
              <View style={[s.burnRow, { backgroundColor: themeColors.card2 }]}>
                <View>
                  <Text style={[s.burnLabel, { color: themeColors.txt }]}>🔥 Burn after 24h</Text>
                  <Text style={[s.burnSub, { color: themeColors.txt3 }]}>Post disappears after one day</Text>
                </View>
                <Switch
                  value={burn}
                  onValueChange={setBurn}
                  trackColor={{ false: '#DDD', true: Colors.ogi }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={[s.note, { color: themeColors.txt3, marginTop: 12 }]}>
                Posting as <Text style={{ fontWeight: '700' }}>{user?.campus?.toUpperCase() || 'Campus'}</Text> · Anonymous
              </Text>

              <TouchableOpacity
                style={[s.submitBtn, (guard.level === 'bad' || !title.trim() || imageUploading) && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isPending || imageUploading || guard.level === 'bad' || !title.trim()}
                activeOpacity={0.85}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.submitTxt}>Post Anonymously</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '95%' },
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 20, lineHeight: 24 },
  toBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  toTxt: { fontSize: 11, fontWeight: '600' },
  toLabel: { fontSize: 11, fontWeight: '800' },
  closeCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  inp: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 10, minHeight: 48 },
  ta: { height: 120, textAlignVertical: 'top' },
  burnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 12, marginBottom: 10 },
  burnLabel: { fontSize: 14, fontWeight: '700' },
  burnSub: { fontSize: 11, marginTop: 2 },
  note: { fontSize: 11, textAlign: 'center', marginBottom: 16 },
  submitBtn: { backgroundColor: '#C94030', borderRadius: 14, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitTxt: { fontWeight: '700', fontSize: 15, color: '#fff' },
  mediaBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  mediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  mediaIcon: { fontSize: 18 },
  mediaTxt: { fontSize: 13, fontWeight: '700' },
  previewContainer: { 
    width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', 
    marginBottom: 15, borderWidth: 1, position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
  },
  preview: { width: '100%', height: '100%' },
  previewOverlay: { position: 'absolute', bottom: 10, right: 10 },
  removeImgBtn: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  removeImgTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  eventFields: { marginTop: 4 },
  locBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // Cloudinary upload status badge (top-left of preview)
  cdnBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  cdnBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
