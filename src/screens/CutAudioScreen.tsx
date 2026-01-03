import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, PanResponder, Animated } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { playAudioSegment, pauseAudio, resumeAudio, stopAudio, isPlaying as checkIsPlaying, getCurrentPosition, hasSoundLoaded } from '../utils/AudioPlayerService';
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
  const [currentPlaybackPosition, setCurrentPlaybackPosition] = useState(0); // in milliseconds
  const playbackPositionAnimated = useRef(new Animated.Value(0)).current;

  // Trim mode: 'keep' = keep selected portion, 'delete' = delete selected portion
  const [trimMode, setTrimMode] = useState<'keep' | 'delete'>('keep');

  // Zoom level: 1x to 5x
  const [zoomLevel, setZoomLevel] = useState(1);
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const [baseWaveformWidth, setBaseWaveformWidth] = useState(0); // Store the base width at 1x zoom

  // Waveform dimensions for drag calculations
  const waveformWidth = useRef<number>(0);
  const waveformX = useRef<number>(0);
  const waveformDataRef = useRef<TrimWaveformResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollOffsetX = useRef<number>(0); // Track horizontal scroll offset
  const horizontalScrollRef = useRef<ScrollView>(null);
  const scrollContainerRef = useRef<View>(null); // Ref for the fixed container

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

      // Measure scroll container position (only once, x doesn't change)
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
            waveformX.current = x;
            console.log(`📏 Scroll container measured: x=${x}, width=${width}`);
          });
        }
        
        // Measure waveform for initial width
        if (waveformRef.current) {
          waveformRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
            waveformWidth.current = width;
            console.log(`📱 Initial waveform width: ${width}`);
          });
        }
      }, 100);
    }
  }, [waveform]);

  useEffect(() => {
    // Update waveform width when zoom level changes (x stays the same)
    if (waveformRef.current && baseWaveformWidth > 0) {
      // Just update the width, x doesn't change because ScrollView container position is fixed
      waveformWidth.current = baseWaveformWidth * zoomLevel;
      console.log(`🔍 Zoom ${zoomLevel}x: width updated to ${waveformWidth.current}px (base=${baseWaveformWidth}) waveformcurrentX=${waveformX.current}`, );
    }
  }, [zoomLevel, baseWaveformWidth]);

  useEffect(() => {
    // Check playback state and position periodically
    playbackCheckInterval.current = setInterval(() => {
      const playing = checkIsPlaying();
      setIsPlaying(playing);

      if (playing && waveformDataRef.current) {
        // Get current playback position from AudioPlayerService
        getCurrentPosition((position) => {
          setCurrentPlaybackPosition(position);
          const percentage = (position / waveformDataRef.current!.duration) * 100;
          playbackPositionAnimated.setValue(percentage);
        });
      }
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

      const result = await WaveformGenerator.generate(uri, 125);

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
        // Check if sound is loaded (paused) or need to start new
        const soundLoaded = hasSoundLoaded();
        
        if (soundLoaded) {
          // Resume existing sound
          resumeAudio();
          setIsPlaying(true);
        } else {
          // Start new playback based on trim mode
          const success = await playAudioSegment(uri, trimStart, trimEnd, true, trimMode);

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

  // Adjust trim times with +/- buttons
  const adjustTrimStart = async (delta: number) => {
    if (!waveformDataRef.current) return;
    
    const newStart = Math.max(0, Math.min(trimStart + delta, trimEnd - 1000));
    if (newStart === trimStart) return; // No change
    
    setTrimStart(newStart);
    trimStartRef.current = newStart;
    const percentage = (newStart / waveformDataRef.current.duration) * 100;
    startHandlePosition.setValue(percentage);
    
    // Restart playback if playing
    if (isPlaying) {
      await playAudioSegment(uri, newStart, trimEnd, true, trimMode);
    }
  };

  const adjustTrimEnd = async (delta: number) => {
    if (!waveformDataRef.current) return;
    
    const newEnd = Math.max(trimStart + 1000, Math.min(trimEnd + delta, waveformDataRef.current.duration));
    if (newEnd === trimEnd) return; // No change
    
    setTrimEnd(newEnd);
    trimEndRef.current = newEnd;
    const percentage = (newEnd / waveformDataRef.current.duration) * 100;
    endHandlePosition.setValue(percentage);
    
    // Restart playback if playing
    if (isPlaying) {
      await playAudioSegment(uri, trimStart, newEnd, true, trimMode);
    }
  };

  // Mark start: Set trimStart to 0
  const handleMarkStart = async () => {
    if (!waveformDataRef.current || trimStart === 0) return;
    
    setTrimStart(0);
    trimStartRef.current = 0;
    startHandlePosition.setValue(0);
    
    // Restart playback if playing
    if (isPlaying) {
      await playAudioSegment(uri, 0, trimEnd, true, trimMode);
    }
  };

  // Mark end: Set trimEnd to duration
  const handleMarkEnd = async () => {
    if (!waveformDataRef.current || trimEnd === waveformDataRef.current.duration) return;
    
    const duration = waveformDataRef.current.duration;
    setTrimEnd(duration);
    trimEndRef.current = duration;
    endHandlePosition.setValue(100);
    
    // Restart playback if playing
    if (isPlaying) {
      await playAudioSegment(uri, trimStart, duration, true, trimMode);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    if (zoomLevel < MAX_ZOOM) {
      setZoomLevel(prev => Math.min(prev + 1, MAX_ZOOM));
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > MIN_ZOOM) {
      setZoomLevel(prev => Math.max(prev - MIN_ZOOM, MIN_ZOOM));
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
    // Add scroll offset to account for horizontal scrolling
    const relativeX = (pageX - waveformX.current) + scrollOffsetX.current;
    const percentage = Math.max(0, Math.min(1, relativeX / waveformWidth.current));

    // Convert percentage to milliseconds
    const position = Math.round(percentage * currentWaveform.duration);

    console.log(`📍 Gesture: pageX=${pageX}, waveformX=${waveformX.current}, scrollOffset=${scrollOffsetX.current.toFixed(0)}, relativeX=${relativeX.toFixed(0)}, width=${waveformWidth.current}, %=${percentage.toFixed(2)}, pos=${position}ms`);

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
      onPanResponderRelease: async () => {
        console.log(`✅ Start handle released at: ${trimStart}ms`);
        setIsDragging(false);

        // Seek playback based on trim mode
        if (trimMode === 'keep') {
          // Keep mode: seek to trimStart and play from there
          setCurrentPlaybackPosition(trimStartRef.current);
          const percentage = waveformDataRef.current
            ? (trimStartRef.current / waveformDataRef.current.duration) * 100
            : 0;
          playbackPositionAnimated.setValue(percentage);

          // Auto-play from new position
          await playAudioSegment(uri, trimStartRef.current, trimEndRef.current, true, 'keep');
          setIsPlaying(true);
        } else {
          // Delete mode: seek to start (0) and play with skip
          setCurrentPlaybackPosition(0);
          playbackPositionAnimated.setValue(0);

          // Auto-play from beginning, skipping deleted section
          await playAudioSegment(uri, trimStartRef.current, trimEndRef.current, true, 'delete');
          setIsPlaying(true);
        }
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
      onPanResponderRelease: async () => {
        console.log(`✅ End handle released at: ${trimEnd}ms`);
        setIsDragging(false);

        // Seek playback based on trim mode
        if (trimMode === 'keep') {
          // Keep mode: seek to trimStart and play from there
          setCurrentPlaybackPosition(trimStartRef.current);
          const percentage = waveformDataRef.current
            ? (trimStartRef.current / waveformDataRef.current.duration) * 100
            : 0;
          playbackPositionAnimated.setValue(percentage);

          // Auto-play from new position
          await playAudioSegment(uri, trimStartRef.current, trimEndRef.current, true, 'keep');
          setIsPlaying(true);
        } else {
          // Delete mode: seek to start (0) and play with skip
          setCurrentPlaybackPosition(0);
          playbackPositionAnimated.setValue(0);

          // Auto-play from beginning, skipping deleted section
          await playAudioSegment(uri, trimStartRef.current, trimEndRef.current, true, 'delete');
          setIsPlaying(true);
        }
      },
    })
  ).current;

  // Measure waveform layout - use absolute position
  const waveformRef = useRef<View>(null);

  const onWaveformLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    
    // Store base width when first measured (at zoom level 1)
    if (baseWaveformWidth === 0) {
      setBaseWaveformWidth(width);
      waveformWidth.current = width;
      console.log(`📐 Base width set: ${width}px`);
    } else {
      // Update current width for zoomed state
      waveformWidth.current = width;
      console.log(`📐 Layout measured: width=${width}px, zoom=${zoomLevel}x, expected=${baseWaveformWidth * zoomLevel}px`);
    }
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
              {/* Trim controls at top */}
              <View style={styles.trimControls}>
                <View style={styles.trimControl}>
                  <TouchableOpacity style={styles.trimButton} onPress={() => adjustTrimStart(1000)}>
                    <Text style={styles.trimButtonText}>+</Text>
                  </TouchableOpacity>
                  <View style={styles.trimTimeBox}>
                    <Text style={styles.trimTimeText}>{formatTime(trimStart)}</Text>
                  </View>
                  <TouchableOpacity style={styles.trimButton} onPress={() => adjustTrimStart(-1000)}>
                    <Text style={styles.trimButtonText}>−</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.trimCenter}>
                  <Text style={styles.trimLabel}>Selected</Text>
                  <Text style={styles.trimSelectedTime}>{formatTime(trimEnd - trimStart)}</Text>
                </View>

                <View style={styles.trimControl}>
                  <TouchableOpacity style={styles.trimButton} onPress={() => adjustTrimEnd(1000)}>
                    <Text style={styles.trimButtonText}>+</Text>
                  </TouchableOpacity>
                  <View style={styles.trimTimeBox}>
                    <Text style={styles.trimTimeText}>{formatTime(trimEnd)}</Text>
                  </View>
                  <TouchableOpacity style={styles.trimButton} onPress={() => adjustTrimEnd(-1000)}>
                    <Text style={styles.trimButtonText}>-</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Waveform with overlay handles */}
              <View ref={scrollContainerRef}>
              <ScrollView
                ref={horizontalScrollRef}
                horizontal
                scrollEnabled={zoomLevel > 1 && !isDragging}
                showsHorizontalScrollIndicator={zoomLevel > 1}
                bounces={false}
                nestedScrollEnabled={true}
                directionalLockEnabled={true}
                style={styles.waveformScrollView}
                onScroll={(event) => {
                  scrollOffsetX.current = event.nativeEvent.contentOffset.x;
                }}
                scrollEventThrottle={16}
              >
                <View
                  ref={waveformRef}
                  style={[
                    styles.waveformWrapper,
                    baseWaveformWidth > 0 && { width: baseWaveformWidth * zoomLevel }
                  ]}
                  onLayout={onWaveformLayout}
                  collapsable={false}
                >
                  <WaveformView
                    peaks={waveform.peaks}
                    width={baseWaveformWidth > 0 ? baseWaveformWidth * zoomLevel : undefined}
                    height={300}
                    color={Colors.primary}
                    backgroundColor="rgba(255, 255, 255, 0.04)"
                  />

                {/* Overlay to show selected/unselected regions */}
                <View style={styles.trimOverlayContainer} pointerEvents="none">
                  {trimMode === 'keep' ? (
                    <>
                      {/* Gray out left side */}
                      <Animated.View
                        style={[
                          styles.trimOverlay,
                          styles.trimOverlayGray,
                          {
                            left: 0,
                            width: startHandlePosition.interpolate({
                              inputRange: [0, 100],
                              outputRange: ['0%', '100%']
                            })
                          }
                        ]}
                      />
                      {/* Gray out right side */}
                      <Animated.View
                        style={[
                          styles.trimOverlay,
                          styles.trimOverlayGray,
                          {
                            left: endHandlePosition.interpolate({
                              inputRange: [0, 100],
                              outputRange: ['0%', '100%']
                            }),
                            right: 0
                          }
                        ]}
                      />
                    </>
                  ) : (
                    /* Gray out middle (selected for deletion) */
                    <Animated.View
                      style={[
                        styles.trimOverlay,
                        styles.trimOverlayGray,
                        {
                          left: startHandlePosition.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                          }),
                          width: Animated.subtract(
                            endHandlePosition,
                            startHandlePosition
                          ).interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                          })
                        }
                      ]}
                    />
                  )}
                </View>

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

                  {/* Playback position indicator */}
                  {isPlaying && (
                    <Animated.View
                      style={[
                        styles.playbackIndicator,
                        {
                          left: playbackPositionAnimated.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                          })
                        }
                      ]}
                      pointerEvents="none"
                    >
                      <View style={styles.playbackLine} />
                    </Animated.View>
                  )}
                </View>
              </View>
              </ScrollView>
              </View>

              {/* <Text style={styles.waveformInfo}>
                {waveform.peaks.length} bars • {formatTime(waveform.duration)}
              </Text> */}
            </View>
          ) : null}
          {/* Bottom action bar */}
          {waveform && (
            <View style={styles.bottomBar}>
              <View style={styles.bottomButtonGroup}>
                <TouchableOpacity style={styles.bottomButton} onPress={handleMarkStart}>
                  <Image source={require('../../assets/icon/mark_start.png')} style={styles.bottomBarIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomButton} onPress={handleMarkEnd}>
                  <Image source={require('../../assets/icon/mark_end.png')} style={styles.bottomBarIcon} />
                </TouchableOpacity>
              </View>

              <Text style={styles.timeDisplay}>{formatTime(isPlaying ? currentPlaybackPosition : trimStart)} / {formatTime(waveform.duration)}</Text>
              
              <View style={styles.bottomButtonGroup}>
                <TouchableOpacity 
                  style={[styles.bottomButton, zoomLevel === MIN_ZOOM && styles.bottomButtonDisabled]} 
                  onPress={handleZoomOut}
                  disabled={zoomLevel === MIN_ZOOM}
                >
                  <Image source={require('../../assets/icon/zoomout.png')} style={styles.bottomBarIcon} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.bottomButton, zoomLevel === MAX_ZOOM && styles.bottomButtonDisabled]} 
                  onPress={handleZoomIn}
                  disabled={zoomLevel === MAX_ZOOM}
                >
                  <Image source={require('../../assets/icon/zoomin.png')} style={styles.bottomBarIcon} />
                </TouchableOpacity>
              </View>

            </View>
          )}
          {/* Action buttons */}
          {waveform && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
                <Image
                  source={isPlaying
                    ? require('../../assets/icon/pause.png')
                    : require('../../assets/icon/start.png')
                  }
                  style={styles.playButtonIcon}
                />
              </TouchableOpacity>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    trimMode === 'keep' && styles.actionButtonActive
                  ]}
                  onPress={() => setTrimMode('keep')}
                >
                  <Image source={require('../../assets/icon/keep_select.png')} style={styles.actionButtonIcon} />
                  <Text style={styles.actionText}>Keep selected</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    trimMode === 'delete' && styles.actionButtonActive
                  ]}
                  onPress={() => setTrimMode('delete')}
                >
                  <Image source={require('../../assets/icon/del_select.png')} style={styles.actionButtonIcon} />
                  <Text style={styles.actionText}>Delete selected</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
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
    tintColor: Colors.white,
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
    backgroundColor: 'rgba(20, 20, 30, 0.99)',
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
    color: Colors.white,
    marginBottom: 2,
  },
  trimSelectedTime: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  waveformScrollView: {
    maxWidth: '100%',
  },
  waveformWrapper: {
    position: 'relative',
    minWidth: '100%',
  },
  trimOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  trimOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  trimOverlayGray: {
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
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
  playbackIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 5,
  },
  playbackLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  waveformInfo: {
    fontSize: 12,
    color: Colors.backgroundLight,
    textAlign: 'center',
    marginTop: 8,
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
    // marginTop: 24,
    marginBottom: 80,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
  actionButtonActive: {
    backgroundColor: 'rgba(142, 90, 247, 0.2)',
    borderColor: '#8E5AF7',
    borderWidth: 2,
  },
  actionButtonIcon: {
    width: 20,
    height: 20,
    // tintColor: Colors.white,
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
    // position: 'absolute',
    // bottom: 0,
    // left: 0,
    // right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // paddingHorizontal: 20,
    // paddingVertical: 16,
    // backgroundColor: 'rgba(20, 20, 30, 0.95)',
    // borderTopWidth: 1,
    // borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },

  bottomButtonGroup: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 6,
  },
  bottomButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtonDisabled: {
    opacity: 0.3,
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
