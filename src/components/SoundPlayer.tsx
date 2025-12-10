import { useEffect, useRef, useState } from 'react';
import Sound from 'react-native-sound';
import { NativeModules, Vibration } from 'react-native';
const { FlashModule } = NativeModules;

interface SoundPlayerProps {
  soundFile: string; // Chỉ sử dụng string paths
  loop?: boolean;
  vibrate?: boolean;
  vibrationPattern?: number[];
  flash?: boolean; // Thêm flash option
  onFlashChange?: (isFlashing: boolean) => void; // Callback cho flash state
}

export const useSoundPlayer = ({
  soundFile,
  loop = false,
  vibrate = false,
  vibrationPattern = [0, 1000, 500, 1000],
  flash = false,
  onFlashChange,
}: SoundPlayerProps) => {
  const soundRef = useRef<Sound | null>(null);
  const flashIntervalRef = useRef<any>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    // Initialize sound
    Sound.setCategory('Playback');
    
    if (!soundFile) {
      console.log('No sound file provided');
      return;
    }

    try {
      // Đơn giản hóa - chỉ thử một cách
      console.log('Attempting to load sound:', soundFile);
      soundRef.current = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log('Failed to load sound:', soundFile);
          console.log('Error details:', error);
        } else {
          console.log('✅ Sound loaded successfully:', soundFile);
          console.log('Sound info:', {
            duration: soundRef.current?.getDuration(),
            loaded: soundRef.current?.isLoaded()
          });
        }
      });
    } catch (error) {
      console.log('❌ Exception while initializing sound:', error);
    }

    return () => {
      if (soundRef.current) {
        console.log('🧹 Cleaning up sound:', soundFile);
        soundRef.current.release();
        soundRef.current = null;
      }
      // Cleanup flash interval
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
      }
    };
  }, [soundFile]);

  // Flash control functions
  const startFlashing = async () => {
    if (flash && !flashIntervalRef.current) {
      console.log('🔦 Starting flash with FlashModule');
      stopFlashing(); // Dừng interval cũ nếu có
      
      // Check if device has flash first
      try {
        if (FlashModule && FlashModule.hasFlashlight) {
          const hasFlash = await FlashModule.hasFlashlight();
          if (!hasFlash) {
            console.log('Device does not support flash, using UI flash only');
            setIsFlashing(true);
            if (onFlashChange) onFlashChange(true);
            return;
          }
        }
      } catch (error) {
        console.log('Error checking flash capability:', error);
        setIsFlashing(true);
        if (onFlashChange) onFlashChange(true);
        return;
      }
      
      let on = false;
      flashIntervalRef.current = setInterval(async () => {
        on = !on;
        setIsFlashing(on);
        if (onFlashChange) onFlashChange(on);
        
        try {
          if (FlashModule && FlashModule.switchFlash) {
            await FlashModule.switchFlash(on);
            console.log('FlashModule state:', on ? 'ON' : 'OFF');
          } else {
            console.log('FlashModule not available, using UI flash only');
          }
        } catch (error) {
          console.log('FlashModule error (continuing with UI flash only):', error);
        }
      }, 120); // Flash every 120ms
    }
  };
  const stopFlashing = async () => {
    if (flashIntervalRef.current) {
      console.log('🔦 Stopping flash');
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    
    // Tắt flash device
    try {
      if (FlashModule && FlashModule.switchFlash) {
        await FlashModule.switchFlash(false);
        console.log('FlashModule turned OFF');
      }
    } catch (error) {
      console.log('FlashModule turn off error (ignoring):', error);
    }
    
    setIsFlashing(false);
    if (onFlashChange) onFlashChange(false);
  };

  const playSound = () => {
    console.log('🎵 Attempting to play sound...');
    console.log('Flash enabled:', flash);
    
    if (!soundRef.current) {
      console.log('❌ No sound reference available');
      return;
    }

    if (!soundRef.current.isLoaded()) {
      console.log('❌ Sound not loaded yet');
      return;
    }

    try {
      soundRef.current.play((success) => {
        if (success) {
          console.log('✅ Sound played successfully');
          // Start flashing when sound starts
          
        } else {
          console.log('❌ Playback failed due to audio decoding errors');
        }
      });

      if (loop) {
        soundRef.current.setNumberOfLoops(-1);
      }

      if (flash) {
        console.log('🔦 Starting flash from playSound');
        startFlashing();
      }

      if (vibrate) {
        try {
          Vibration.vibrate(vibrationPattern, true);
        } catch (error) {
          console.warn('Vibration not available or permission denied:', error);
        }
      }
    } catch (error) {
      console.log('❌ Exception during playSound:', error);
    }
  };

  const stopSound = () => {
    if (soundRef.current) {
      soundRef.current.stop();
      // Stop flashing when sound stops
      stopFlashing();
      
      try {
        Vibration.cancel();
      } catch (error) {
        console.warn('Failed to cancel vibration:', error);
      }
    }
  };

  const pauseSound = () => {
    if (soundRef.current) {
      soundRef.current.pause();
      // Stop flashing when sound pauses
      stopFlashing();
      
      try {
        Vibration.cancel();
      } catch (error) {
        console.warn('Failed to cancel vibration:', error);
      }
    }
  };

  return {
    playSound,
    stopSound,
    pauseSound,
    isFlashing,
    startFlashing,
    stopFlashing,
  };
};