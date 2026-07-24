export interface Track {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl: string;
}

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

// Universal Sound Manager
class UniversalSoundManager {
  private currentAudio: HTMLAudioElement | null = null;

  async play(url: string, onEnded?: () => void) {
    this.stop();
    try {
      if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
        this.currentAudio = new window.Audio(url);
        if (onEnded) this.currentAudio.onended = onEnded;
        await this.currentAudio.play();
      }
    } catch (e) {
      console.log('Audio play note:', e);
    }
  }

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
  }
}

export const soundManager = new UniversalSoundManager();

