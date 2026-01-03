import RNFS from 'react-native-fs';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';

export interface TrimResult {
  outputPath: string;
  duration: number;
  size: number;
}

/**
 * Trims audio file based on mode (keep or delete selection)
 * Uses FFmpeg for audio processing
 */
export class AudioTrimmer {
  /**
   * Trim audio file
   * @param inputPath - Source audio file path
   * @param startMs - Start time in milliseconds
   * @param endMs - End time in milliseconds
   * @param mode - 'keep' to keep only selected portion, 'delete' to remove selected portion
   */
  static async trim(
    inputPath: string,
    startMs: number,
    endMs: number,
    mode: 'keep' | 'delete'
  ): Promise<TrimResult> {
    try {
      console.log(`🎬 Starting audio trim: ${mode} mode, ${startMs}ms to ${endMs}ms`);
      
      // Generate output filename
      const timestamp = Date.now();
      const originalName = inputPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'audio';
      const outputName = `${originalName}_${mode}_${timestamp}.mp3`;
      const outputPath = `${RNFS.CachesDirectoryPath}/${outputName}`;

      if (mode === 'keep') {
        // Keep mode: Extract portion from startMs to endMs
        await this.extractSegment(inputPath, outputPath, startMs, endMs);
      } else {
        // Delete mode: Remove portion from startMs to endMs
        await this.removeSegment(inputPath, outputPath, startMs, endMs);
      }

      // Get output file info
      const stat = await RNFS.stat(outputPath);
      
      // Calculate actual duration from FFmpeg output
      // For keep mode: duration is the trimmed segment
      // For delete mode: need to calculate from original - deleted segment
      const trimmedDuration = mode === 'keep' ? (endMs - startMs) : 0;
      
      console.log(`✅ Trim completed: ${outputPath}, size=${stat.size} bytes`);
      
      return {
        outputPath,
        duration: trimmedDuration,
        size: stat.size,
      };
    } catch (error) {
      console.error('❌ Trim error:', error);
      throw error;
    }
  }

  /**
   * Extract a segment from audio (for keep mode)
   */
  private static async extractSegment(
    inputPath: string,
    outputPath: string,
    startMs: number,
    endMs: number
  ): Promise<void> {
    console.log(`📋 Extracting segment ${startMs}ms to ${endMs}ms`);
    
    // Convert milliseconds to seconds for FFmpeg
    const startSec = startMs / 1000;
    const durationSec = (endMs - startMs) / 1000;
    
    // FFmpeg command: Extract from startSec with duration
    // -i: input file
    // -ss: start time
    // -t: duration
    // -c copy: copy codec (fast, no re-encoding)
    const command = `-y -i "${inputPath}" -ss ${startSec} -t ${durationSec} -c copy "${outputPath}"`;
    
    console.log(`🎬 FFmpeg command: ${command}`);
    
    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();
    
    if (!ReturnCode.isSuccess(returnCode)) {
      const output = await session.getOutput();
      const failStackTrace = await session.getFailStackTrace();
      console.error('❌ FFmpeg failed:', output, failStackTrace);
      throw new Error(`Failed to extract audio segment: ${output}`);
    }
    
    console.log('✅ Segment extracted successfully');
  }

  /**
   * Remove a segment from audio (for delete mode)
   */
  private static async removeSegment(
    inputPath: string,
    outputPath: string,
    startMs: number,
    endMs: number
  ): Promise<void> {
    console.log(`✂️ Removing segment ${startMs}ms to ${endMs}ms`);
    
    // Convert milliseconds to seconds
    const startSec = startMs / 1000;
    const endSec = endMs / 1000;
    
    // Create temp files for the two segments
    const temp1 = `${RNFS.CachesDirectoryPath}/temp_part1_${Date.now()}.mp3`;
    const temp2 = `${RNFS.CachesDirectoryPath}/temp_part2_${Date.now()}.mp3`;
    const listFile = `${RNFS.CachesDirectoryPath}/concat_list_${Date.now()}.txt`;
    
    try {
      // Step 1: Extract first part (0 to startSec)
      if (startSec > 0) {
        const cmd1 = `-y -i "${inputPath}" -t ${startSec} -c copy "${temp1}"`;
        console.log(`🎬 FFmpeg part 1: ${cmd1}`);
        const session1 = await FFmpegKit.execute(cmd1);
        const rc1 = await session1.getReturnCode();
        if (!ReturnCode.isSuccess(rc1)) {
          throw new Error('Failed to extract first part');
        }
      }
      
      // Step 2: Extract second part (endSec to end)
      const cmd2 = `-y -i "${inputPath}" -ss ${endSec} -c copy "${temp2}"`;
      console.log(`🎬 FFmpeg part 2: ${cmd2}`);
      const session2 = await FFmpegKit.execute(cmd2);
      const rc2 = await session2.getReturnCode();
      if (!ReturnCode.isSuccess(rc2)) {
        throw new Error('Failed to extract second part');
      }
      
      // Step 3: Concatenate parts
      if (startSec > 0) {
        // Both parts exist, concatenate them
        const listContent = `file '${temp1}'\nfile '${temp2}'`;
        await RNFS.writeFile(listFile, listContent, 'utf8');
        
        const cmd3 = `-y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;
        console.log(`🎬 FFmpeg concat: ${cmd3}`);
        const session3 = await FFmpegKit.execute(cmd3);
        const rc3 = await session3.getReturnCode();
        if (!ReturnCode.isSuccess(rc3)) {
          throw new Error('Failed to concatenate parts');
        }
      } else {
        // Only second part exists (deleted from beginning)
        await RNFS.copyFile(temp2, outputPath);
      }
      
      console.log('✅ Segment removed successfully');
      
    } finally {
      // Cleanup temp files
      try {
        if (await RNFS.exists(temp1)) await RNFS.unlink(temp1);
        if (await RNFS.exists(temp2)) await RNFS.unlink(temp2);
        if (await RNFS.exists(listFile)) await RNFS.unlink(listFile);
      } catch (e) {
        console.warn('⚠️ Failed to cleanup temp files:', e);
      }
    }
  }
}
