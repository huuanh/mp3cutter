import { NativeModules } from 'react-native';

const { WaveformModule } = NativeModules;

export interface TrimWaveformResult {
  peaks: number[];
  duration: number;
}

/**
 * Fast waveform generator for audio trimming UI.
 * Simple, lightweight, optimized for speed.
 */
export const WaveformGenerator = {
  /**
   * Decode audio file to waveform peaks.
   * @param uri - Audio file URI (file://, content://, etc)
   * @param barCount - Number of bars to generate (100-200, default 160)
   * @returns Waveform peaks (0..1) and duration in milliseconds
   */
  async generate(uri: string, barCount: number = 160): Promise<TrimWaveformResult> {
    if (!WaveformModule) {
      throw new Error('WaveformModule not found. Make sure native module is linked.');
    }
    
    const result = await WaveformModule.generateWaveform(uri, barCount);
    
    return {
      peaks: result.peaks,
      duration: result.duration,
    };
  },
  
  /**
   * Clear waveform cache.
   */
  clearCache(): void {
    WaveformModule?.clearCache();
  },
};
