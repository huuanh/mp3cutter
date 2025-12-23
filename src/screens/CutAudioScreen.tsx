import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../constants/colors';
import { SCREEN_NAMES } from '../constants';
import type { RootStackParamList } from '../navigation/RootNavigator';

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

type CutAudioFileParams = RootStackParamList[typeof SCREEN_NAMES.CUT_AUDIO];
const CutAudioScreen: React.FC = () => {
  const route = useRoute<CutAudioRouteProp>();
  const insets = useSafeAreaInsets();
  const { name, type, size, uri } = route.params;

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]} >
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        <Text style={styles.heading}>Selected Audio</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{name}</Text>

          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{type}</Text>

          <Text style={styles.label}>Size</Text>
          <Text style={styles.value}>{formatFileSize(size)} ({size} bytes)</Text>

          <Text style={styles.label}>URI</Text>
          <Text style={styles.value}>{uri}</Text>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Audio trimming placeholder</Text>
          <Text style={styles.placeholderDescription}>
            Hook up your waveform editor or trimming controls here to let users
            select the segment they want to keep.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.backgroundLight,
    marginTop: 12,
  },
  value: {
    fontSize: 15,
    color: Colors.white,
    marginTop: 4,
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
