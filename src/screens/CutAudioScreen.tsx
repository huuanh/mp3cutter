import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, PanResponder, Animated } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { playAudioSegment, pauseAudio, resumeAudio, stopAudio, isPlaying as checkIsPlaying } from '../utils/AudioPlayerService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { Colors, GradientStyles } from '../constants/colors';
import { SCREEN_NAMES } from '../constants';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { WaveformGenerator, type TrimWaveformResult } from '../utils/WaveformGenerator';
import { WaveformView } from '../components/WaveformView';

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

type CutAudioRouteProp = RouteProp<RootStackParamList, typeof SCREEN_NAMES.CUT_AUDIO>;

const CutAudioScreen: React.FC = () => {
  const route = useRoute<CutAudioRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { name, type, size, uri } = route.params;

  const [waveform, setWaveform] = useState<TrimWaveformResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Trim selection state (in milliseconds)
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const trimStartRef = useRef(0);
  const trimEndRef = useRef(0);
  
  // Animated values for smooth handle movement
  const startHandlePosition = useRef(new Animated.Value(0)).current;
  const endHandlePosition = useRef(new Animated.Value(100)).current;
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackCheckInterval = useRef<number | null>(null);
  
  // Waveform dimensions for drag calculations
  const waveformWidth = useRef<number>(0);
  const waveformX = useRef<number>(0);
  const waveformDataRef = useRef<TrimWaveformResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadWaveform();
  }, [uri]);
  
  useEffect(() => {
    if (waveform) {
      waveformDataRef.current = waveform;
      setTrimStart(0);
      setTrimEnd(waveform.duration);
      trimStartRef.current = 0;
      trimEndRef.current = waveform.duration;
      startHandlePosition.setValue(0);
      endHandlePosition.setValue(100);
      
      // Measure waveform position after it's rendered
      setTimeout(() => {
        if (waveformRef.current) {
          waveformRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
            waveformX.current = x;
            waveformWidth.current = width;
            console.log(`📏 Waveform measured after load: x=${x}, width=${width}`);
          });
        }
      }, 100);
    }
  }, [waveform]);
  
  useEffect(() => {
    // Check playback state periodically
    playbackCheckInterval.current = setInterval(() => {
      setIsPlaying(checkIsPlaying());
    }, 200);
    
    return () => {
      if (playbackCheckInterval.current) {
        clearInterval(playbackCheckInterval.current);
      }
      stopAudio();
    };
  }, []);

  const loadWaveform = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎵 Loading waveform for:', uri);
      const startTime = Date.now();
      
      const result = await WaveformGenerator.generate(uri, 160);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Waveform loaded in ${elapsed}ms, ${result.peaks.length} bars, ${result.duration}ms duration`);
      
      setWaveform(result);
    } catch (err: any) {
      console.error('❌ Waveform error:', err);
      setError(err.message || 'Failed to load waveform');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        // Pause playback
        pauseAudio();
        setIsPlaying(false);
      } else {
        // Check if we need to resume or start new playback
        if (checkIsPlaying()) {
          resumeAudio();
          setIsPlaying(true);
        } else {
          // Start playback from trimStart to trimEnd with loop
          const success = await playAudioSegment(uri, trimStart, trimEnd, true);
          
          if (success) {
            setIsPlaying(true);
          } else {
            Alert.alert('Error', 'Failed to play audio');
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Play/Pause error:', err);
      Alert.alert('Error', 'Failed to play audio: ' + err.message);
      setIsPlaying(false);
    }
  };
  
  // Calculate position from gesture
  const calculatePositionFromGesture = (pageX: number): number => {
    const currentWaveform = waveformDataRef.current;
    if (!currentWaveform || waveformWidth.current === 0) {
      console.log('⚠️ Cannot calculate: waveform=', !!currentWaveform, 'width=', waveformWidth.current);
      return 0;
    }
    
    // Convert absolute page X to relative position within waveform
    const relativeX = pageX - waveformX.current;
    const percentage = Math.max(0, Math.min(1, relativeX / waveformWidth.current));
    
    // Convert percentage to milliseconds
    const position = Math.round(percentage * currentWaveform.duration);
    
    console.log(`📍 Gesture: pageX=${pageX}, waveformX=${waveformX.current}, width=${waveformWidth.current}, %=${percentage.toFixed(2)}, pos=${position}ms`);
    
    return position;
  };
  
  // Pan responder for start handle
  const startHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        console.log('👆 Start handle touched');
        setIsDragging(true);
        // Stop playback when starting to drag
        if (isPlaying) {
          pauseAudio();
          setIsPlaying(false);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const newStart = calculatePositionFromGesture(evt.nativeEvent.pageX);
        const currentWaveform = waveformDataRef.current;
        
        console.log(`✋ Moving start handle to: ${newStart}ms (current: ${trimStartRef.current}ms)`);
        // Ensure start is before end (with minimum gap of 1 second)
        if (newStart >= 0 && newStart < trimEndRef.current - 1000 && currentWaveform) {
          setTrimStart(newStart);
          trimStartRef.current = newStart;
          const percentage = (newStart / currentWaveform.duration) * 100;
          startHandlePosition.setValue(percentage);
        }
      },
      onPanResponderRelease: () => {
        console.log(`✅ Start handle released at: ${trimStart}ms`);
        setIsDragging(false);
      },
    })
  ).current;
  
  // Pan responder for end handle
  const endHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        console.log('👆 End handle touched');
        setIsDragging(true);
        // Stop playback when starting to drag
        if (isPlaying) {
          pauseAudio();
          setIsPlaying(false);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const newEnd = calculatePositionFromGesture(evt.nativeEvent.pageX);
        const currentWaveform = waveformDataRef.current;
        console.log(`✋ Moving end handle to: ${newEnd}ms (current: ${trimEndRef.current}ms), evt.pageX=${evt.nativeEvent.pageX}`);
        // Ensure end is after start (with minimum gap of 1 second)
        if (currentWaveform && newEnd > trimStartRef.current + 1000 && newEnd <= currentWaveform.duration) {
          setTrimEnd(newEnd);
          trimEndRef.current = newEnd;
          const percentage = (newEnd / currentWaveform.duration) * 100;
          endHandlePosition.setValue(percentage);
        }
      },
      onPanResponderRelease: () => {
        console.log(`✅ End handle released at: ${trimEnd}ms`);
        setIsDragging(false);
      },
    })
  ).current;
  
  // Measure waveform layout - use absolute position
  const waveformRef = useRef<View>(null);
  
  const onWaveformLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    waveformWidth.current = width;
    console.log(`📐 Layout measured: width=${width}`);
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={GradientStyles.dark.colors}
        start={GradientStyles.dark.start}
        end={GradientStyles.dark.end}
        style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Image source={require('../../assets/icon/back.png')} style={styles.backButtonIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          bounces={false}
          scrollEnabled={!isDragging}
        >
          {/* File info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Size:</Text>
              <Text style={styles.infoValue}>{formatFileSize(size)}</Text>
            </View>
            {waveform && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration:</Text>
                <Text style={styles.infoValue}>{formatTime(waveform.duration)}</Text>
              </View>
            )}
          </View>

          {/* Waveform */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Generating waveform...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadWaveform}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : waveform ? (
            <View style={styles.waveformContainer}>
              <Text style={styles.sectionTitle}>Audio Waveform</Text>
              
              {/* Trim controls at top */}
              <View style={styles.trimControls}>
                <View style={styles.trimControl}>
                  <Image source={require('../../assets/icon/mark_start.png')} style={styles.trimMarkerIcon} />
                  <View style={styles.trimTimeBox}>
                    <Text style={styles.trimTimeText}>{formatTime(trimStart)}</Text>
                  </View>
                </View>
                
                <View style={styles.trimCenter}>
                  <Text style={styles.trimLabel}>Selected</Text>
                  <Text style={styles.trimSelectedTime}>{formatTime(trimEnd - trimStart)}</Text>
                </View>
                
                <View style={styles.trimControl}>
                  <View style={styles.trimTimeBox}>
                    <Text style={styles.trimTimeText}>{formatTime(trimEnd)}</Text>
                  </View>
                  <Image source={require('../../assets/icon/mark_end.png')} style={styles.trimMarkerIcon} />
                </View>
              </View>
              
              {/* Waveform with overlay handles */}
              <View 
                ref={waveformRef}
                style={styles.waveformWrapper}
                onLayout={onWaveformLayout}
                collapsable={false}
              >
                <WaveformView 
                  peaks={waveform.peaks}
                  height={120}
                  color="#8E5AF7"
                  backgroundColor="rgba(255, 255, 255, 0.04)"
                />
                
                {/* Trim handles overlay */}
                <View style={styles.trimHandlesContainer} collapsable={false}>
                  {/* Start handle */}
                  <Animated.View 
                    {...startHandlePanResponder.panHandlers}
                    style={[
                      styles.trimHandle, 
                      styles.trimHandleStart,
                      { 
                        left: startHandlePosition.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%']
                        })
                      }
                    ]}
                    collapsable={false}
                  >
                    <View style={styles.handleIndicator}>
                      <View style={styles.handleChevron}>
                        <Text style={styles.handleChevronText}>‹</Text>
                      </View>
                    </View>
                    <View style={styles.handleLine} />
                  </Animated.View>
                  
                  {/* End handle */}
                  <Animated.View 
                    {...endHandlePanResponder.panHandlers}
                    style={[
                      styles.trimHandle, 
                      styles.trimHandleEnd,
                      { 
                        left: endHandlePosition.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%']
                        })
                      }
                    ]}
                    collapsable={false}
                  >
                    <View style={styles.handleIndicator}>
                      <View style={styles.handleChevron}>
                        <Text style={styles.handleChevronText}>›</Text>
                      </View>
                    </View>
                    <View style={styles.handleLine} />
                  </Animated.View>
                  
                  {/* Time indicator in middle */}
                  <View style={styles.centerTimeIndicator}>
                    <Text style={styles.centerTime}>{formatTime((trimStart + trimEnd) / 2)}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.waveformInfo}>
                {waveform.peaks.length} bars • {formatTime(waveform.duration)}
              </Text>
            </View>
          ) : null}

          {/* Action buttons */}
          {waveform && (
            <View style={styles.actionsContainer}>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionButton}>
                  <Image source={require('../../assets/icon/keep_select.png')} style={styles.actionButtonIcon} />
                  <Text style={styles.actionText}>Keep selected</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Image source={require('../../assets/icon/del_select.png')} style={styles.actionButtonIcon} />
                  <Text style={styles.actionText}>Delete selected</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
                <Image 
                  source={isPlaying 
                    ? require('../../assets/icon/pause.png') 
                    : require('../../assets/icon/start.png')
                  } 
                  style={styles.playButtonIcon} 
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        
        {/* Bottom action bar */}
        {waveform && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.bottomButton}>
              <Image source={require('../../assets/icon/return.png')} style={styles.bottomBarIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton}>
              <Image source={require('../../assets/icon/forward.png')} style={styles.bottomBarIcon} />
            </TouchableOpacity>
            <Text style={styles.timeDisplay}>{formatTime(trimStart)} / {formatTime(waveform.duration)}</Text>
            <TouchableOpacity style={styles.bottomButton}>
              <Image source={require('../../assets/icon/zoomout.png')} style={styles.bottomBarIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton}>
              <Image source={require('../../assets/icon/zoomin.png')} style={styles.bottomBarIcon} />
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.white,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
  },
  waveformContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 12,
  },
  trimControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  trimControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trimMarkerIcon: {
    width: 24,
    height: 24,
    tintColor: '#8E5AF7',
  },
  trimButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimButtonText: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '600',
  },
  trimTimeBox: {
    backgroundColor: 'rgba(20, 20, 30, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 90, 247, 0.5)',
  },
  trimTimeText: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  trimCenter: {
    alignItems: 'center',
  },
  trimLabel: {
    fontSize: 11,
    color: Colors.backgroundLight,
    marginBottom: 2,
  },
  trimSelectedTime: {
    fontSize: 14,
    color: '#8E5AF7',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  waveformWrapper: {
    position: 'relative',
  },
  trimHandlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none', // Allow touches to pass through to children
  },
  trimHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40, // Increase touch area
    marginLeft: -20, // Center on the line
    zIndex: 10,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  trimHandleStart: {},
  trimHandleEnd: {},
  handleIndicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 24,
  },
  handleChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8E5AF7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  handleChevronText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '700',
  },
  handleLine: {
    position: 'absolute',
    top: 16,
    left: 19, // Center the line (40/2 - 1)
    bottom: 0,
    width: 2,
    backgroundColor: '#8E5AF7',
  },
  centerTimeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  centerTime: {
    fontSize: 11,
    color: Colors.white,
    backgroundColor: 'rgba(20, 20, 30, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  waveformInfo: {
    fontSize: 12,
    color: Colors.backgroundLight,
    textAlign: 'center',
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.backgroundLight,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '400',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.backgroundLight,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.backgroundLight,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#8E5AF7',
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '700',
  },
  actionsContainer: {
    marginTop: 24,
    marginBottom: 80,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 90, 247, 0.3)',
    gap: 8,
  },
  actionButtonIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.white,
  },
  actionText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  playButton: {
    alignSelf: 'center',
    // marginTop: 8,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIcon: {
    width: 25,
    height: 25,
    tintColor: Colors.black,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  bottomButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBarIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.white,
  },
  timeDisplay: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
});

export default CutAudioScreen;
