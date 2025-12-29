import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
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

  useEffect(() => {
    loadWaveform();
  }, [uri]);

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
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
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
              <ActivityIndicator size="large" color="#8E5AF7" />
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
              <WaveformView 
                peaks={waveform.peaks}
                height={120}
                color="#8E5AF7"
                backgroundColor="rgba(255, 255, 255, 0.04)"
              />
              <Text style={styles.waveformInfo}>
                {waveform.peaks.length} bars • {formatTime(waveform.duration)}
              </Text>
            </View>
          ) : null}

          {/* Placeholder for trim controls */}
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>🎬 Trim Controls Coming Soon</Text>
            <Text style={styles.placeholderDescription}>
              Drag handles on waveform to select start/end points for trimming.
            </Text>
          </View>
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
  backButtonText: {
    fontSize: 24,
    color: Colors.white,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  waveformContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 12,
  },
  waveformInfo: {
    fontSize: 12,
    color: Colors.backgroundLight,
    textAlign: 'center',
    marginTop: 8,
  },
  placeholder: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
  },
  placeholderDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.backgroundLight,
  },
});

export default CutAudioScreen;
