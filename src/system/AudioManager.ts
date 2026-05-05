/**
 * AudioManager handles all audio playback.
 * Background music and sound effects with volume control.
 */
export class AudioManager {
  /** Background music sound */
  private bgMusic: Phaser.Sound.BaseSound | null = null;

  /** Sound effect references */
  private sfx: Map<string, Phaser.Sound.BaseSound> = new Map();

  /** Master volume (0-1) */
  private masterVolume: number = 0.7;

  /** Music volume (0-1) */
  private musicVolume: number = 0.4;

  /** SFX volume (0-1) */
  private sfxVolume: number = 0.8;

  /** Whether audio is muted */
  private muted: boolean = false;

  /** Scene reference */
  private scene: Phaser.Scene | null = null;

  constructor() {}

  /**
   * Initializes the audio manager with a scene reference.
   * Call this from the scene constructor.
   */
  public init(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /**
   * Sets the master volume.
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.updateVolumes();
  }

  /**
   * Sets the music volume.
   */
  public setMusicVolume(volume: number): void {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.updateVolumes();
  }

  /**
   * Sets the SFX volume.
   */
  public setSFXVolume(volume: number): void {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.updateVolumes();
  }

  /**
   * Updates volumes on all playing sounds.
   */
  private updateVolumes(): void {
    const globalVolume = this.muted ? 0 : this.masterVolume;

    if (this.bgMusic) {
      (this.bgMusic as any).volume = this.musicVolume * globalVolume;
    }

    this.sfx.forEach(sound => {
      (sound as any).volume = this.sfxVolume * globalVolume;
    });
  }

  /**
   * Mutes or unmutes all audio.
   */
  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateVolumes();
  }

  /**
   * Toggles mute on/off.
   */
  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.updateVolumes();
    return this.muted;
  }

  /**
   * Plays background music.
   * Loops automatically.
   */
  public playMusic(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.scene) return;

    // Stop existing music
    this.stopMusic();

    // Check if sound exists
    if (!this.scene.cache.audio.has(key)) {
      console.warn(`Audio not found: ${key}`);
      return;
    }

    // Create new music
    this.bgMusic = this.scene.sound.add(key, {
      loop: true,
      volume: this.musicVolume * this.masterVolume,
      ...config,
    });

    this.bgMusic.play();
  }

  /**
   * Stops background music.
   */
  public stopMusic(): void {
    if (this.bgMusic) {
      this.bgMusic.stop();
      this.bgMusic.destroy();
      this.bgMusic = null;
    }
  }

  /**
   * Pauses background music.
   */
  public pauseMusic(): void {
    this.bgMusic?.pause();
  }

  /**
   * Resumes background music.
   */
  public resumeMusic(): void {
    this.bgMusic?.resume();
  }

  /**
   * Plays a sound effect.
   */
  public playSFX(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.scene) return;

    // Check if sound exists
    if (!this.scene.cache.audio.has(key)) {
      return; // Skip silently - audio is optional
    }

    const sound = this.scene.sound.add(key, {
      volume: this.sfxVolume * this.masterVolume,
      ...config,
    });

    sound.play();

    // Auto-destroy when complete
    sound.once('complete', () => {
      sound.destroy();
    });
  }

  /**
   * Plays the collect item sound effect.
   */
  public playCollect(): void {
    this.playSFX('collect-sfx');
  }

  /**
   * Plays the detection sound effect.
   */
  public playDetect(): void {
    this.playSFX('detect-sfx');
  }

  /**
   * Plays the win sound effect.
   */
  public playWin(): void {
    this.playSFX('win-sfx');
  }

  /**
   * Plays the lose sound effect.
   */
  public playLose(): void {
    this.playSFX('lose-sfx');
  }

  /**
   * Stops all sounds.
   */
  public stopAll(): void {
    this.stopMusic();
    this.sfx.forEach(sound => sound.stop());
    this.sfx.clear();
  }

  /**
   * Destroys the audio manager and cleans up resources.
   */
  public destroy(): void {
    this.stopAll();
    this.scene = null;
  }
}

// Global audio manager instance
const audioManagerInstance = new AudioManager();

/**
 * Gets the global audio manager instance.
 */
export function getAudioManager(): AudioManager {
  return audioManagerInstance;
}
