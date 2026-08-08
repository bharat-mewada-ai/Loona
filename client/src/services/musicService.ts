import { Audio, InterruptionModeIOS, InterruptionModeAndroid, AVPlaybackStatus } from 'expo-av';

export interface Track {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl: string;
}

// ─── Audio Mode ────────────────────────────────────────────────────────────────
let audioConfigured = false;
const configureAudio = async () => {
  if (audioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false,
    });
    audioConfigured = true;
  } catch (e) {
    console.log('[AudioMode] non-fatal:', e);
  }
};
configureAudio();

// ─── iTunes Search ─────────────────────────────────────────────────────────────
// Do NOT add country=IN — India blocks most preview URLs on iTunes store.
const fetchFromItunes = async (term: string, limit = 50): Promise<Track[]> => {
  const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.results?.length) return [];
  return data.results
    .filter((item: any) => !!item.previewUrl && !!item.trackId && !!item.trackName)
    .map((item: any) => ({
      trackId: item.trackId,
      trackName: item.trackName,
      artistName: item.artistName || 'Unknown Artist',
      previewUrl: item.previewUrl,
      artworkUrl: item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb', '300x300bb')
        : '',
    }));
};

export const getTrendingTracks = async (): Promise<Track[]> => {
  const terms = [
    'bollywood+2024',
    'bollywood+hits',
    'hindi+songs',
    'top+hits+2024',
    'pop+hits',
    'trending+songs',
  ];
  for (const term of terms) {
    try {
      const tracks = await fetchFromItunes(term, 50);
      if (tracks.length >= 5) return tracks;
    } catch (_) {}
  }
  return [];
};

export const searchTracks = async (query: string): Promise<Track[]> => {
  if (!query || query.trim().length < 2) return getTrendingTracks();
  try {
    const tracks = await fetchFromItunes(encodeURIComponent(query), 50);
    return tracks.length > 0 ? tracks : getTrendingTracks();
  } catch (_) {
    return getTrendingTracks();
  }
};

// ─── Sound Manager ─────────────────────────────────────────────────────────────
class SoundManager {
  private sound: Audio.Sound | null = null;
  private _isPlaying = false;

  /**
   * Play audio from a URL.
   * @param url        - The audio URL to play
   * @param onEnded    - Called when playback finishes naturally
   * @param startOffsetMs - Start position in milliseconds (for song trimmer)
   */
  async play(
    url: string | null | undefined,
    onEnded?: () => void,
    startOffsetMs = 0
  ): Promise<void> {
    if (!url) return;

    await configureAudio();
    await this.stop(); // Always stop previous sound first

    try {
      // Load WITHOUT playing, then seek & play — avoids positionMillis+shouldPlay crash
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false, volume: 1.0 }
      );

      this.sound = sound;

      // Seek to offset if needed
      if (startOffsetMs > 0) {
        try {
          await sound.setPositionAsync(startOffsetMs);
        } catch (_) {}
      }

      // Now actually play
      await sound.playAsync();
      this._isPlaying = true;

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
          this._isPlaying = false;
          return;
        }
        if (status.didJustFinish) {
          this._isPlaying = false;
          this.sound = null;
          onEnded?.();
        }
      });
    } catch (err) {
      console.log('[SoundManager] play error:', err);
      this.sound = null;
      this._isPlaying = false;
    }
  }

  async stop(): Promise<void> {
    const s = this.sound;
    this.sound = null;
    this._isPlaying = false;
    if (s) {
      try { await s.stopAsync(); } catch (_) {}
      try { await s.unloadAsync(); } catch (_) {}
    }
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }
}

export const soundManager = new SoundManager();
