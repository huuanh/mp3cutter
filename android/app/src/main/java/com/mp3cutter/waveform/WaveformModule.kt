package com.mp3cutter.waveform

import android.util.LruCache
import com.facebook.react.bridge.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class WaveformModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val generator = SimpleWaveformGenerator(reactContext)
    private val cache = LruCache<String, CachedWaveform>(10)
    
    data class CachedWaveform(
        val peaks: FloatArray,
        val durationMs: Long
    )
    
    override fun getName() = "WaveformModule"
    
    @ReactMethod
    fun generateWaveform(uri: String, barCount: Int, promise: Promise) {
        val cacheKey = "$uri:$barCount"
        
        // Check cache first
        cache.get(cacheKey)?.let {
            promise.resolve(createResultMap(it.peaks, it.durationMs))
            return
        }
        
        // Generate in background
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    generator.generate(uri, barCount)
                }
                
                // Cache result
                cache.put(cacheKey, CachedWaveform(result.peaks, result.durationMs))
                
                promise.resolve(createResultMap(result.peaks, result.durationMs))
            } catch (e: Exception) {
                promise.reject("WAVEFORM_ERROR", e.message, e)
            }
        }
    }
    
    @ReactMethod
    fun clearCache() {
        cache.evictAll()
    }
    
    private fun createResultMap(peaks: FloatArray, durationMs: Long): WritableMap {
        val peaksArray = Arguments.createArray()
        peaks.forEach { peaksArray.pushDouble(it.toDouble()) }
        
        return Arguments.createMap().apply {
            putArray("peaks", peaksArray)
            putDouble("duration", durationMs.toDouble())
        }
    }
}
