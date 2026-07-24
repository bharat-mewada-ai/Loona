import { Audio } from 'expo-av';

export interface Track {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl: string;
}

// Enable audio playback in silent mode on mobile devices
Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: true,
}).catch(() => {});

export const searchTracks = async (query: string): Promise<Track[]> => {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`);
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


