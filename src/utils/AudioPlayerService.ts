import Sound from 'react-native-sound';

let currentSound: Sound | null = null;
let playbackInterval: ReturnType<typeof setInterval> | null = null;
let trimEndMs: number = 0;
let trimStartMs: number = 0;

// Enable playback in silence mode
Sound.setCategory('Playback');

export const playAudioSegment = async (
  uri: string,
  startMs: number,
  endMs: number,
  loop: boolean = true
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      // Stop current playback if any
      stopAudio();
      
      trimStartMs = startMs;
      trimEndMs = endMs;
      
      console.log(`🎵 Loading audio: ${uri}`);
      console.log(`⏱️ Playing from ${startMs}ms to ${endMs}ms (loop: ${loop})`);
      
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
        
        // Seek to start position
        currentSound.setCurrentTime(startMs / 1000);
        
        // Play sound
        currentSound.play((success) => {
          if (!success) {
            console.log('⚠️ Playback failed');
          }
        });
        
        // Monitor playback position and loop
        if (loop) {
          playbackInterval = setInterval(() => {
            if (currentSound) {
              currentSound.getCurrentTime((seconds) => {
                const positionMs = seconds * 1000;
                
                // If we've passed the end point, seek back to start
                if (positionMs >= endMs) {
                  console.log(`🔁 Looping back to ${startMs}ms`);
                  currentSound?.setCurrentTime(startMs / 1000);
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
    if (currentSound) {
      currentSound.pause();
      console.log('⏸️ Paused');
    }
  } catch (error) {
    console.error('❌ Pause error:', error);
  }
};

export const resumeAudio = () => {
  try {
    if (currentSound) {
      currentSound.play((success) => {
        if (!success) {
          console.log('⚠️ Resume failed');
        } else {
          console.log('▶️ Resumed');
        }
      });
    }
  } catch (error) {
    console.error('❌ Resume error:', error);
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
