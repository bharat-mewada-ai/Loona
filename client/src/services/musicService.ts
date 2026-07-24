import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

export interface Track {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl: string;
}

// Configured audio mode for mobile speaker playback even in silent mode
const configureAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.log('[AudioMode] Error setting audio mode:', e);
  }
};
configureAudio();

// Pre-fetched popular trending songs for Instagram-style initial suggestions list
export const getTrendingTracks = async (): Promise<Track[]> => {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=bollywood+top+hits&entity=song&limit=20`);
    const data = await res.json();
    if (!data || !data.results) return [];
    return data.results.map((item: any) => ({
      trackId: item.trackId,
      trackName: item.trackName,
      artistName: item.artistName,
      previewUrl: item.previewUrl,
      artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : '',
    }));
  } catch (err) {
    return [];
  }
};

export const searchTracks = async (query: string): Promise<Track[]> => {
  if (!query || query.trim().length < 2) return getTrendingTracks();
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`);
    const data = await res.json();
    if (!data || !data.results) return [];
    return data.results.map((item: any) => ({
      trackId: item.trackId,
      trackName: item.trackName,
      artistName: item.artistName,
      previewUrl: item.previewUrl,
      artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : '',
    }));
  } catch (err) {
    console.error('Track search error:', err);
    return [];
  }
};

// Universal Sound Manager — works on Web & Mobile Native Apps!
class UniversalSoundManager {
  private currentWebAudio: HTMLAudioElement | null = null;
  private currentExpoSound: Audio.Sound | null = null;

  async play(url: string, onEnded?: () => void) {
    await this.stop();
    try {
      // 1. Try Native Expo Audio for Android / iOS app
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 1.0 }
      );
      this.currentExpoSound = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (onEnded) onEnded();
        }
      });
      await sound.playAsync();
      return;
    } catch (nativeErr) {
      console.log('[SoundManager] Expo sound playback note, fallback to Web Audio:', nativeErr);
    }

    // 2. Fallback to Web HTML5 Audio
    try {
      if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
        this.currentWebAudio = new window.Audio(url);
        if (onEnded) this.currentWebAudio.onended = onEnded;
        await this.currentWebAudio.play();
      }
    } catch (e) {
      console.log('[SoundManager] Web audio error:', e);
    }
  }

  async stop() {
    if (this.currentExpoSound) {
      try {
        await this.currentExpoSound.stopAsync();
        await this.currentExpoSound.unloadAsync();
      } catch (e) {}
      this.currentExpoSound = null;
    }
    if (this.currentWebAudio) {
      try {
        this.currentWebAudio.pause();
        this.currentWebAudio.currentTime = 0;
      } catch (e) {}
      this.currentWebAudio = null;
    }
  }
}

export const soundManager = new UniversalSoundManager();


