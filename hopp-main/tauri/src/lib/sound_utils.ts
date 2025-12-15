// src/lib/sound-utils.ts
import { invoke } from "@tauri-apps/api/core";

class SoundPlayer {
  private readonly soundName: string;

  constructor(soundName: string) {
    this.soundName = soundName;
  }

  play() {
    invoke("play_sound", { soundName: this.soundName })
      .then(() => {})
      .catch((error) => {
        console.error("Failed to play sound:", error);
      });
  }

  stop() {
    invoke("stop_sound", { soundName: this.soundName })
      .then(() => {})
      .catch((error) => {
        console.error("Failed to stop sound:", error);
      });
  }
}

export const soundUtils = {
  createPlayer: (soundName: string) => new SoundPlayer(soundName),
};
