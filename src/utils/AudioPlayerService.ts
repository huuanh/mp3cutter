import Sound from 'react-native-sound';

let currentSound: Sound | null = null;
let playbackInterval: ReturnType<typeof setInterval> | null = null;
let trimEndMs: number = 0;
let trimStartMs: number = 0;
let playbackMode: 'keep' | 'delete' = 'keep';
let totalDuration: number = 0;
let currentUri: string = '';
let loopEnabled: boolean = true;

// Enable playback in silence mode
Sound.setCategory('Playback');

export const playAudioSegment = async (
  uri: string,
  startMs: number,
  endMs: number,
  loop: boolean = true,
  mode: 'keep' | 'delete' = 'keep'
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      // Stop current playback if any
      stopAudio();
      
      trimStartMs = startMs;
      trimEndMs = endMs;
      playbackMode = mode;
      currentUri = uri;
      loopEnabled = loop;
      
      console.log(`🎵 Loading audio: ${uri}`);
      console.log(`⏱️ Playing mode: ${mode}, from ${startMs}ms to ${endMs}ms (loop: ${loop})`);
      
      // Create sound instance
      currentSound = new Sound(uri, '', (error) => {
        if (error) {
          console.error('❌ Failed to load sound:', error);
          reject(error);
          return;
        }
        
        if (!currentSound) {
          reject(new Error('Sound instance is null'));
          return;
        }
        
        console.log('✅ Sound loaded, duration:', currentSound.getDuration() * 1000, 'ms');
        
        totalDuration = currentSound.getDuration() * 1000;
        
        // Seek to start position (0 for delete mode, startMs for keep mode)
        const initialPosition = mode === 'delete' ? 0 : startMs;
        currentSound.setCurrentTime(initialPosition / 1000);
        
        // Play sound
        currentSound.play((success) => {
          if (!success) {
            console.log('⚠️ Playback failed');
          }
        });
        
        // Monitor playback position and loop
        if (loop || mode === 'delete') {
          playbackInterval = setInterval(() => {
            if (currentSound) {
              currentSound.getCurrentTime((seconds) => {
                const positionMs = seconds * 1000;
                
                if (mode === 'keep') {
                  // Keep mode: loop within trimStart to trimEnd
                  if (positionMs >= endMs) {
                    console.log(`🔁 Looping back to ${startMs}ms`);
                    currentSound?.setCurrentTime(startMs / 1000);
                  }
                } else {
                  // Delete mode: skip the deleted section (trimStart to trimEnd)
                  if (positionMs >= startMs && positionMs < endMs) {
                    // We're in the deleted section, skip to trimEnd
                    console.log(`⏭️ Skipping deleted section, jumping to ${endMs}ms`);
                    currentSound?.setCurrentTime(endMs / 1000);
                  } else if (positionMs >= totalDuration - 100 && loop) {
                    // Reached end, loop back to start
                    console.log(`🔁 Looping back to 0ms`);
                    currentSound?.setCurrentTime(0);
                  }
                }
              });
            }
          }, 100); // Check every 100ms
        }
        
        console.log('▶️ Playback started');
        resolve(true);
      });
    } catch (error) {
      console.error('❌ Play error:', error);
      reject(error);
    }
  });
};

export const pauseAudio = () => {
  try {
    // Stop monitoring interval but keep sound instance alive
    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = null;
    }
    
    if (currentSound && currentSound.isPlaying()) {
      currentSound.pause();
      console.log('⏸️ Paused');
    }
  } catch (error) {
    console.error('❌ Pause error:', error);
  }
};

export const resumeAudio = () => {
  try {
    if (!currentSound) {
      console.log('⚠️ No sound instance to resume');
      return false;
    }
    
    // Check current position BEFORE resuming
    currentSound.getCurrentTime((currentSeconds) => {
      const currentPositionMs = currentSeconds * 1000;
      
      // If in delete mode and paused in the deleted section, skip to trimEnd
      if (playbackMode === 'delete' && currentPositionMs >= trimStartMs && currentPositionMs < trimEndMs) {
        console.log(`⏭️ Paused in deleted section (${currentPositionMs}ms), skipping to ${trimEndMs}ms`);
        currentSound?.setCurrentTime(trimEndMs / 1000);
      }
      // If in keep mode and paused outside the keep range, seek to trimStart
      else if (playbackMode === 'keep' && (currentPositionMs < trimStartMs || currentPositionMs >= trimEndMs)) {
        console.log(`⏭️ Paused outside keep range (${currentPositionMs}ms), seeking to ${trimStartMs}ms`);
        currentSound?.setCurrentTime(trimStartMs / 1000);
      }
      
      // Now resume playback
      currentSound?.play((success) => {
        if (!success) {
          console.log('⚠️ Resume failed');
          return;
        }
        
        console.log('▶️ Resumed');
        
        // Restart monitoring interval for loop/skip functionality
        if (loopEnabled || playbackMode === 'delete') {
          if (playbackInterval) {
            clearInterval(playbackInterval);
          }
          
          playbackInterval = setInterval(() => {
            if (currentSound) {
              currentSound.getCurrentTime((seconds) => {
                const positionMs = seconds * 1000;
                
                if (playbackMode === 'keep') {
                  // Keep mode: loop within trimStart to trimEnd
                  if (positionMs >= trimEndMs) {
                    console.log(`🔁 Looping back to ${trimStartMs}ms`);
                    currentSound?.setCurrentTime(trimStartMs / 1000);
                  }
                } else {
                  // Delete mode: skip the deleted section (trimStart to trimEnd)
                  if (positionMs >= trimStartMs && positionMs < trimEndMs) {
                    console.log(`⏭️ Skipping deleted section, jumping to ${trimEndMs}ms`);
                    currentSound?.setCurrentTime(trimEndMs / 1000);
                  } else if (positionMs >= totalDuration - 100 && loopEnabled) {
                    console.log(`🔁 Looping back to 0ms`);
                    currentSound?.setCurrentTime(0);
                  }
                }
              });
            }
          }, 100);
        }
      });
    });
    
    return true;
  } catch (error) {
    console.error('❌ Resume error:', error);
    return false;
  }
};

export const stopAudio = () => {
  try {
    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = null;
    }
    
    if (currentSound) {
      currentSound.stop(() => {
        currentSound?.release();
        currentSound = null;
        console.log('⏹️ Stopped and released');
      });
    }
  } catch (error) {
    console.error('❌ Stop error:', error);
  }
};

export const isPlaying = (): boolean => {
  return currentSound?.isPlaying() ?? false;
};

export const hasSoundLoaded = (): boolean => {
  return currentSound !== null;
};

export const getCurrentPosition = (callback: (position: number) => void): void => {
  if (currentSound) {
    currentSound.getCurrentTime((seconds) => {
      callback(seconds * 1000); // Convert to milliseconds
    });
  } else {
    // Return appropriate position based on mode when no sound loaded
    callback(playbackMode === 'delete' ? 0 : trimStartMs);
  }
};
