import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sound from 'react-native-sound';

import { Colors, GradientStyles } from '../constants/colors';
import { SCREEN_NAMES } from '../constants';
import type { RootStackParamList } from '../navigation/RootNavigator';

type SaveSuccessRouteProp = RouteProp<RootStackParamList, typeof SCREEN_NAMES.SAVE_SUCCESS>;

const SaveSuccessScreen: React.FC = () => {
  const route = useRoute<SaveSuccessRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { outputPath, duration, size, originalName } = route.params;

  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Sound | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup sound on unmount
      if (sound) {
        sound.stop(() => sound.release());
      }
    };
  }, [sound]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePlayPause = () => {
    if (!sound) {
      // Load and play sound
      const newSound = new Sound(outputPath, '', (error) => {
        if (error) {
          console.error('Failed to load sound:', error);
          return;
        }
        newSound.play((success) => {
          if (success) {
            setIsPlaying(false);
            newSound.setCurrentTime(0);
          }
        });
        setIsPlaying(true);
      });
      setSound(newSound);
    } else {
      if (isPlaying) {
        sound.pause();
        setIsPlaying(false);
      } else {
        sound.play((success) => {
          if (success) {
            setIsPlaying(false);
            sound.setCurrentTime(0);
          }
        });
        setIsPlaying(true);
      }
    }
  };

  const handleBackToHome = () => {
    navigation.navigate(SCREEN_NAMES.HOME as never);
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
          <TouchableOpacity style={styles.backButton} onPress={handleBackToHome}>
            <Image source={require('../../assets/icon/back.png')} style={styles.iconWhite} />
          </TouchableOpacity>
          <View style={styles.headerPlaceholder} />
          <TouchableOpacity style={styles.shareButton}>
            <Image source={require('../../assets/icon/back.png')} style={[styles.iconWhite, { transform: [{ rotate: '180deg' }] }]} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Success message */}
          <Text style={styles.successTitle}>Audio saved successfully!!!</Text>

          {/* File info card */}
          <View style={styles.fileCard}>
            <View style={styles.fileIconContainer}>
              <View style={styles.waveIcon}>
                <View style={styles.waveLine} />
                <View style={[styles.waveLine, { height: 30 }]} />
                <View style={styles.waveLine} />
              </View>
            </View>

            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {originalName || 'Trimmed Audio'}
              </Text>
              <Text style={styles.fileDetails}>
                {formatTime(duration)} | {formatFileSize(size)} | MP3
              </Text>
            </View>

            <TouchableOpacity style={styles.editButton}>
              <Image source={require('../../assets/icon/back.png')} style={styles.iconWhite} />
            </TouchableOpacity>
          </View>

          {/* Playback controls */}
          <View style={styles.playbackSection}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
              <Image
                source={isPlaying 
                  ? require('../../assets/icon/pause.png')
                  : require('../../assets/icon/start.png')
                }
                style={styles.playIcon}
              />
            </TouchableOpacity>
            <Text style={styles.timeDisplay}>00:40 / {formatTime(duration)}</Text>
          </View>

          {/* More options */}
          <Text style={styles.sectionTitle}>More options</Text>
          <View style={styles.optionsGrid}>
            <TouchableOpacity style={styles.optionCard}>
              <View style={styles.optionIcon}>
                <Image source={require('../../assets/icon/back.png')} style={styles.iconWhite} />
              </View>
              <Text style={styles.optionText}>Merge Audio</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard}>
              <View style={styles.optionIcon}>
                <Image source={require('../../assets/icon/back.png')} style={styles.iconWhite} />
              </View>
              <Text style={styles.optionText}>Change Pitch</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard}>
              <View style={styles.optionIcon}>
                <Image source={require('../../assets/icon/back.png')} style={styles.iconWhite} />
              </View>
              <Text style={styles.optionText}>Compress Audio</Text>
            </TouchableOpacity>
          </View>

          {/* Back to home button */}
          <TouchableOpacity style={styles.homeButton} onPress={handleBackToHome}>
            <Text style={styles.homeButtonText}>Back to home</Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholder: {
    flex: 1,
  },
  iconWhite: {
    width: 24,
    height: 24,
    tintColor: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waveIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.white,
    borderRadius: 1,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 4,
  },
  fileDetails: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playbackSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  playIcon: {
    width: 28,
    height: 28,
    tintColor: Colors.background,
  },
  timeDisplay: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  optionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 12,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default SaveSuccessScreen;
