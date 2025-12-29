package com.mp3cutter.waveform

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.util.Log
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs

/**
 * Fast, simple waveform generator for audio trimming UI.
 * Uses MediaExtractor + MediaCodec for PCM decoding.
 * Optimized for speed and low memory usage.
 */
class SimpleWaveformGenerator(private val context: Context) {
    
    companion object {
        private const val TAG = "SimpleWaveformGen"
        private const val DEFAULT_BAR_COUNT = 160
        private const val MIN_BAR_COUNT = 100
        private const val MAX_BAR_COUNT = 200
        private const val TIMEOUT_US = 10000L
    }
    
    data class WaveformResult(
        val peaks: FloatArray,
        val durationMs: Long
    )
    
    /**
     * Generate waveform peaks for audio file.
     * Memory-efficient: computes peaks on-the-fly during decoding.
     */
    fun generate(uri: String, barCount: Int = DEFAULT_BAR_COUNT): WaveformResult {
        val clampedBarCount = barCount.coerceIn(MIN_BAR_COUNT, MAX_BAR_COUNT)
        
        val extractor = MediaExtractor()
        var codec: MediaCodec? = null
        
        try {
            // Setup extractor
            extractor.setDataSource(context, Uri.parse(uri), null)
            
            // Find audio track
            val audioTrackIndex = findAudioTrack(extractor)
            if (audioTrackIndex < 0) {
                throw IllegalArgumentException("No audio track found")
            }
            
            extractor.selectTrack(audioTrackIndex)
            val format = extractor.getTrackFormat(audioTrackIndex)
            
            // Get duration
            val durationUs = format.getLong(MediaFormat.KEY_DURATION)
            val durationMs = durationUs / 1000
            
            Log.d(TAG, "Audio duration: ${durationMs}ms, bars: $clampedBarCount")
            
            // Setup codec for PCM decoding
            val mime = format.getString(MediaFormat.KEY_MIME) ?: throw IllegalStateException("No MIME type")
            codec = MediaCodec.createDecoderByType(mime)
            codec.configure(format, null, null, 0)
            codec.start()
            
            // Decode and compute peaks directly (memory efficient)
            val peaks = decodeToPeaks(extractor, codec, clampedBarCount, durationUs)
            
            Log.d(TAG, "Generated ${peaks.size} peaks")
            
            return WaveformResult(peaks, durationMs)
            
        } finally {
            codec?.stop()
            codec?.release()
            extractor.release()
        }
    }
    
    private fun findAudioTrack(extractor: MediaExtractor): Int {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
            if (mime.startsWith("audio/")) {
                return i
            }
        }
        return -1
    }
    
    /**
     * Decode audio and compute peaks directly (memory efficient).
     * Instead of storing all samples, we compute peaks on-the-fly.
     */
    private fun decodeToPeaks(
        extractor: MediaExtractor,
        codec: MediaCodec,
        barCount: Int,
        durationUs: Long
    ): FloatArray {
        val peaks = FloatArray(barCount)
        val bufferInfo = MediaCodec.BufferInfo()
        var inputDone = false
        var outputDone = false
        var totalSamples = 0L
        
        // Estimate samples per bar
        val sampleRate = 44100 // Assume typical sample rate
        val estimatedTotalSamples = (durationUs * sampleRate / 1_000_000).toLong()
        val samplesPerBar = (estimatedTotalSamples / barCount).coerceAtLeast(1)
        
        Log.d(TAG, "Estimated samples per bar: $samplesPerBar")
        
        while (!outputDone) {
            // Feed input
            if (!inputDone) {
                val inputIndex = codec.dequeueInputBuffer(TIMEOUT_US)
                if (inputIndex >= 0) {
                    val inputBuffer = codec.getInputBuffer(inputIndex)!!
                    val sampleSize = extractor.readSampleData(inputBuffer, 0)
                    
                    if (sampleSize < 0) {
                        codec.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                        inputDone = true
                    } else {
                        val presentationTime = extractor.sampleTime
                        codec.queueInputBuffer(inputIndex, 0, sampleSize, presentationTime, 0)
                        extractor.advance()
                    }
                }
            }
            
            // Get output and compute peaks directly
            val outputIndex = codec.dequeueOutputBuffer(bufferInfo, TIMEOUT_US)
            if (outputIndex >= 0) {
                val outputBuffer = codec.getOutputBuffer(outputIndex)!!
                
                if (bufferInfo.size > 0) {
                    outputBuffer.position(bufferInfo.offset)
                    outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
                    outputBuffer.order(ByteOrder.LITTLE_ENDIAN)
                    
                    // Process samples and update peaks on-the-fly
                    while (outputBuffer.remaining() >= 2) {
                        val sample = outputBuffer.short.toFloat() / 32768f
                        val barIndex = (totalSamples / samplesPerBar).toInt().coerceIn(0, barCount - 1)
                        
                        val peak = abs(sample)
                        if (peak > peaks[barIndex]) {
                            peaks[barIndex] = peak
                        }
                        totalSamples++
                    }
                }
                
                codec.releaseOutputBuffer(outputIndex, false)
                
                if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                    outputDone = true
                }
            } else if (outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                val newFormat = codec.outputFormat
                Log.d(TAG, "Output format: $newFormat")
            }
        }
        
        Log.d(TAG, "Processed $totalSamples samples")
        
        // Normalize peaks
        val maxPeak = peaks.maxOrNull() ?: 1f
        if (maxPeak > 0) {
            for (i in peaks.indices) {
                peaks[i] = peaks[i] / maxPeak
            }
        }
        
        return peaks
    }
}
