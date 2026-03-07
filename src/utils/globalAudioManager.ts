/**
 * Global Audio Manager
 * Ensures only one audio/video element plays at a time across the entire app.
 * When a new element starts playing, all previously registered elements are paused.
 */

type MediaElement = HTMLAudioElement | HTMLVideoElement;

class GlobalAudioManager {
  private activeElements = new Set<MediaElement>();
  private currentPlaying: MediaElement | null = null;

  /**
   * Register a media element. When it starts playing, all others are stopped.
   */
  register(element: MediaElement): void {
    this.activeElements.add(element);
  }

  /**
   * Unregister a media element (e.g., on unmount).
   */
  unregister(element: MediaElement): void {
    this.activeElements.delete(element);
    if (this.currentPlaying === element) {
      this.currentPlaying = null;
    }
  }

  /**
   * Call before playing an element. Pauses all other registered elements.
   */
  play(element: MediaElement): void {
    // Pause all other elements
    for (const el of this.activeElements) {
      if (el !== element && !el.paused) {
        el.pause();
        el.currentTime = 0;
      }
    }
    this.currentPlaying = element;
  }

  /**
   * Stop all registered elements.
   */
  stopAll(): void {
    for (const el of this.activeElements) {
      if (!el.paused) {
        el.pause();
        el.currentTime = 0;
      }
    }
    this.currentPlaying = null;
  }

  /**
   * Get the currently playing element.
   */
  getCurrent(): MediaElement | null {
    return this.currentPlaying;
  }
}

export const globalAudioManager = new GlobalAudioManager();
