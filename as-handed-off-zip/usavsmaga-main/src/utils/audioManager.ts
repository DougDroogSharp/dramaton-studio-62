/**
 * AudioManager - Singleton Web Audio API manager for game audio
 * 
 * Uses Web Audio API instead of HTML5 Audio for better timing and control.
 * Manages channels (BGM, Ambience, SFX) with independent volume controls.
 */

type ChannelType = 'bgm' | 'ambience' | 'sfx';

interface AudioTrack {
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  buffer: AudioBuffer | null;
  isPlaying: boolean;
  loop: boolean;
}

interface PreloadedAsset {
  buffer: AudioBuffer;
  url: string;
}

class AudioManagerSingleton {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channels: Map<ChannelType, AudioTrack> = new Map();
  private preloadedAssets: Map<string, PreloadedAsset> = new Map();
  private volumes: Record<ChannelType, number> = {
    bgm: 0.7,
    ambience: 0.5,
    sfx: 1.0,
  };
  private masterVolume: number = 1.0;
  private initialized: boolean = false;

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async init(): Promise<boolean> {
    if (this.initialized && this.context?.state === 'running') {
      return true;
    }

    try {
      // Create or resume audio context
      if (!this.context) {
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      // Create master gain node
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.context.destination);

      // Initialize channels
      for (const channel of ['bgm', 'ambience', 'sfx'] as ChannelType[]) {
        const gainNode = this.context.createGain();
        gainNode.gain.value = this.volumes[channel];
        gainNode.connect(this.masterGain);
        
        this.channels.set(channel, {
          source: null,
          gainNode,
          buffer: null,
          isPlaying: false,
          loop: channel !== 'sfx', // BGM and ambience loop by default
        });
      }

      this.initialized = true;
      console.log('[AudioManager] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[AudioManager] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Ensure audio context is ready (call before any audio operation)
   */
  private async ensureContext(): Promise<boolean> {
    if (!this.initialized) {
      return await this.init();
    }
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
    return this.context?.state === 'running' || false;
  }

  /**
   * Decode audio from URL or Base64 data
   */
  private async decodeAudio(urlOrData: string): Promise<AudioBuffer | null> {
    if (!this.context) return null;

    try {
      let arrayBuffer: ArrayBuffer;

      if (urlOrData.startsWith('data:')) {
        // Base64 data URL
        const base64 = urlOrData.split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        // Regular URL
        const response = await fetch(urlOrData);
        arrayBuffer = await response.arrayBuffer();
      }

      return await this.context.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('[AudioManager] Failed to decode audio:', error);
      return null;
    }
  }

  /**
   * Preload audio assets for a scene
   */
  async preloadAssets(urls: string[]): Promise<number> {
    if (!await this.ensureContext()) return 0;

    let loaded = 0;
    const loadPromises = urls.map(async (url) => {
      if (this.preloadedAssets.has(url)) {
        loaded++;
        return;
      }

      const buffer = await this.decodeAudio(url);
      if (buffer) {
        this.preloadedAssets.set(url, { buffer, url });
        loaded++;
      }
    });

    await Promise.all(loadPromises);
    console.log(`[AudioManager] Preloaded ${loaded}/${urls.length} assets`);
    return loaded;
  }

  /**
   * Get or decode an audio buffer
   */
  private async getBuffer(url: string): Promise<AudioBuffer | null> {
    const cached = this.preloadedAssets.get(url);
    if (cached) return cached.buffer;

    const buffer = await this.decodeAudio(url);
    if (buffer) {
      this.preloadedAssets.set(url, { buffer, url });
    }
    return buffer;
  }

  /**
   * Play audio on a specific channel
   */
  async play(
    channel: ChannelType,
    url: string,
    options: { loop?: boolean; volume?: number; fadeIn?: number } = {}
  ): Promise<boolean> {
    if (!await this.ensureContext()) return false;
    if (!this.context || !this.masterGain) return false;

    const track = this.channels.get(channel);
    if (!track) return false;

    // Stop current playback on this channel
    this.stop(channel);

    // Get or decode buffer
    const buffer = await this.getBuffer(url);
    if (!buffer) return false;

    try {
      // Create new source
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = options.loop ?? track.loop;
      source.connect(track.gainNode);

      // Handle fade in
      if (options.fadeIn && options.fadeIn > 0) {
        track.gainNode.gain.setValueAtTime(0, this.context.currentTime);
        track.gainNode.gain.linearRampToValueAtTime(
          options.volume ?? this.volumes[channel],
          this.context.currentTime + options.fadeIn
        );
      } else if (options.volume !== undefined) {
        track.gainNode.gain.setValueAtTime(options.volume, this.context.currentTime);
      }

      // Start playback
      source.start(0);
      
      // Update track state
      track.source = source;
      track.buffer = buffer;
      track.isPlaying = true;

      // Handle end of playback for non-looping
      source.onended = () => {
        if (track.source === source) {
          track.isPlaying = false;
          track.source = null;
        }
      };

      return true;
    } catch (error) {
      console.error(`[AudioManager] Failed to play on ${channel}:`, error);
      return false;
    }
  }

  /**
   * Convenience methods for each channel
   */
  async playBGM(url: string, options?: { fadeIn?: number; volume?: number }): Promise<boolean> {
    return this.play('bgm', url, { loop: true, ...options });
  }

  async playAmbience(url: string, options?: { fadeIn?: number; volume?: number }): Promise<boolean> {
    return this.play('ambience', url, { loop: true, ...options });
  }

  async playSFX(url: string, options?: { volume?: number }): Promise<boolean> {
    return this.play('sfx', url, { loop: false, ...options });
  }

  /**
   * Stop playback on a channel
   */
  stop(channel: ChannelType): void {
    const track = this.channels.get(channel);
    if (!track || !track.source) return;

    try {
      track.source.stop();
    } catch (e) {
      // Already stopped
    }
    track.source = null;
    track.isPlaying = false;
  }

  /**
   * Stop all channels
   */
  stopAll(): void {
    for (const channel of ['bgm', 'ambience', 'sfx'] as ChannelType[]) {
      this.stop(channel);
    }
  }

  /**
   * Fade out a channel
   */
  async fadeOut(channel: ChannelType, duration: number = 1): Promise<void> {
    if (!this.context) return;
    
    const track = this.channels.get(channel);
    if (!track || !track.isPlaying) return;

    const currentTime = this.context.currentTime;
    track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, currentTime);
    track.gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);

    // Stop after fade completes
    await new Promise(resolve => setTimeout(resolve, duration * 1000));
    this.stop(channel);
    
    // Reset gain for next play
    track.gainNode.gain.setValueAtTime(this.volumes[channel], this.context.currentTime);
  }

  /**
   * Fade out all channels
   */
  async fadeOutAll(duration: number = 1): Promise<void> {
    await Promise.all([
      this.fadeOut('bgm', duration),
      this.fadeOut('ambience', duration),
      this.fadeOut('sfx', duration),
    ]);
  }

  /**
   * Set volume for a channel (0-1)
   */
  setChannelVolume(channel: ChannelType, volume: number): void {
    this.volumes[channel] = Math.max(0, Math.min(1, volume));
    const track = this.channels.get(channel);
    if (track && this.context) {
      track.gainNode.gain.setValueAtTime(this.volumes[channel], this.context.currentTime);
    }
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
    }
  }

  /**
   * Get current volumes
   */
  getVolumes(): { master: number; channels: Record<ChannelType, number> } {
    return {
      master: this.masterVolume,
      channels: { ...this.volumes },
    };
  }

  /**
   * Check if a channel is currently playing
   */
  isPlaying(channel: ChannelType): boolean {
    return this.channels.get(channel)?.isPlaying || false;
  }

  /**
   * Pause/resume the audio context
   */
  async pause(): Promise<void> {
    if (this.context?.state === 'running') {
      await this.context.suspend();
    }
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * Clear preloaded assets to free memory
   */
  clearCache(): void {
    this.preloadedAssets.clear();
    console.log('[AudioManager] Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { count: number; urls: string[] } {
    return {
      count: this.preloadedAssets.size,
      urls: Array.from(this.preloadedAssets.keys()),
    };
  }
}

// Export singleton instance
export const AudioManager = new AudioManagerSingleton();