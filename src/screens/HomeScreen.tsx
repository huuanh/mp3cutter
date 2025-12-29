import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';

import { Colors, GradientStyles } from '../constants/colors';
import { SCREEN_NAMES } from '../constants';
import { NativeAdComponent } from '../utils/NativeAdComponent';
import { IAPModal } from '../components';
import { useTranslation } from '../hooks/useTranslation';
import AdManager, { ADS_UNIT } from '../utils/AdManager';
import messaging from '@react-native-firebase/messaging';
import type { RootStackParamList } from '../navigation/RootNavigator';

type FeatureItem = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  fallbackTitle: string;
  fallbackSubtitle: string;
  image: ImageSourcePropType;
  screen: string | null;
  requiresVip: boolean;
};

type HighlightCard = {
  titleKey: string;
  ctaKey: string;
  fallbackTitle: string;
  fallbackCta: string;
  requiresVip?: boolean;
};

const HIGHLIGHT_CARD: HighlightCard = {
  titleKey: 'home.cut_audio.title',
  ctaKey: 'home.cut_audio.cta',
  fallbackTitle: 'Cut Audio',
  fallbackCta: 'Cut now',
  requiresVip: false,
};

const FEATURE_ITEMS: FeatureItem[] = [
  {
    id: 'merge-audio',
    titleKey: 'home.merge_audio.title',
    subtitleKey: 'home.merge_audio.subtitle',
    fallbackTitle: 'Merge Audio',
    fallbackSubtitle: 'Combine tracks seamlessly.',
    image: require('../../assets/home/mergeaudio.png'),
    screen: null,
    requiresVip: false,
  },
  {
    id: 'change-pitch',
    titleKey: 'home.change_pitch.title',
    subtitleKey: 'home.change_pitch.subtitle',
    fallbackTitle: 'Change Pitch',
    fallbackSubtitle: 'Adjust vocals instantly.',
    image: require('../../assets/home/changepitch.png'),
    screen: null,
    requiresVip: true,
  },
  {
    id: 'compress-audio',
    titleKey: 'home.compress_audio.title',
    subtitleKey: 'home.compress_audio.subtitle',
    fallbackTitle: 'Compress Audio',
    fallbackSubtitle: 'Reduce file size without hassle.',
    image: require('../../assets/home/compressaudio.png'),
    screen: null,
    requiresVip: true,
  },
  {
    id: 'cut-video',
    titleKey: 'home.cut_video.title',
    subtitleKey: 'home.cut_video.subtitle',
    fallbackTitle: 'Cut Video',
    fallbackSubtitle: 'Trim videos to the perfect moment.',
    image: require('../../assets/home/cutvideo.png'),
    screen: null,
    requiresVip: false,
  },
  {
    id: 'merge-video',
    titleKey: 'home.merge_video.title',
    subtitleKey: 'home.merge_video.subtitle',
    fallbackTitle: 'Merge Video',
    fallbackSubtitle: 'Join clips into one story.',
    image: require('../../assets/home/mergevideo.png'),
    screen: null,
    requiresVip: false,
  },
  {
    id: 'video-to-mp3',
    titleKey: 'home.video_to_mp3.title',
    subtitleKey: 'home.video_to_mp3.subtitle',
    fallbackTitle: 'Video to MP3',
    fallbackSubtitle: 'Extract audio from any video.',
    image: require('../../assets/home/videotomp3.png'),
    screen: null,
    requiresVip: false,
  },
  {
    id: 'compress-video',
    titleKey: 'home.compress_video.title',
    subtitleKey: 'home.compress_video.subtitle',
    fallbackTitle: 'Compress Video',
    fallbackSubtitle: 'Shrink videos for easy sharing.',
    image: require('../../assets/home/compressvideo.png'),
    screen: null,
    requiresVip: true,
  },
  {
    id: 'studio',
    titleKey: 'home.studio.title',
    subtitleKey: 'home.studio.subtitle',
    fallbackTitle: 'Studio',
    fallbackSubtitle: 'All your projects in one place.',
    image: require('../../assets/home/studio.png'),
    screen: null,
    requiresVip: true,
  },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [showIAPModal, setShowIAPModal] = useState(false);

  // Use translation hook
  const { t } = useTranslation();

  async function requestPermission() {
    try {
      // Android 13+ cần POST_NOTIFICATIONS
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied (Android 13+)');
          return false;
        }
      }

      // Firebase (iOS + Android)
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission granted');
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  }


  useEffect(() => {
    // Reset navigation stack to prevent going back
    // navigation.reset({
    //     index: 0,
    //     routes: [{ name: SCREEN_NAMES.ONBOARDING as never }],
    // });

    // Handle hardware back button on Android
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Prevent going back from onboarding
        return true; // Return true to prevent default back behavior
      }
    );

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      requestPermission();
    }, 500);

    return () => clearTimeout(timer);
  }, []);


  const handleMenuPress = async (screen: string) => {
    try {
      // Show interstitial ad before navigation
      console.log('🎯 Showing interstitial ad before navigation to:', screen);
      await AdManager.showInterstitialAd(
        ADS_UNIT.INTERSTITIAL_HOME,
        () => {
          // Navigate after ad is closed
          console.log('📱 Interstitial ad closed, navigating to:', screen);
          navigation.navigate(screen as never);
        },
        (error: any) => {
          // Navigate even if ad fails
          console.log('❌ Interstitial ad failed, navigating anyway:', error);
          navigation.navigate(screen as never);
        }
      );
    } catch (error) {
      // Fallback navigation if ad fails
      console.log('❌ Error showing interstitial ad, navigating anyway:', error);
      navigation.navigate(screen as never);
    }
  };

  const handleSettingsPress = () => {
    navigation.navigate(SCREEN_NAMES.SETTINGS as never);
  };

  const handleVIPPress = () => {
    setShowIAPModal(true);
  };

  const handleCloseIAPModal = () => {
    setShowIAPModal(false);
  };

  const handlePurchase = () => {
    console.log('Purchase initiated from Home');
    setShowIAPModal(false);
  };

  const handleCutAudioPress = useCallback(async () => {
    try {
      // Show interstitial ad before navigation
      console.log('🎯 Showing interstitial ad before navigation to AudioFileSelect');
      await AdManager.showInterstitialAd(
        ADS_UNIT.INTERSTITIAL_HOME,
        () => {
          // Navigate to AudioFileSelectScreen after ad is closed
          console.log('📱 Interstitial ad closed, navigating to AudioFileSelect');
          navigation.navigate(SCREEN_NAMES.AUDIO_FILE_SELECT as never);
        },
        (error: any) => {
          // Navigate even if ad fails
          console.log('❌ Interstitial ad failed, navigating anyway:', error);
          navigation.navigate(SCREEN_NAMES.AUDIO_FILE_SELECT as never);
        }
      );
    } catch (error) {
      // Fallback navigation if ad fails
      console.log('❌ Error showing interstitial ad, navigating anyway:', error);
      navigation.navigate(SCREEN_NAMES.AUDIO_FILE_SELECT as never);
    }
  }, [navigation]);

  const handleFeatureSelect = async (item: FeatureItem) => {
    if (item.requiresVip) {
      setShowIAPModal(true);
      return;
    }

    if (item.screen) {
      await handleMenuPress(item.screen);
      return;
    }

    Alert.alert(
      t('home.coming_soon.title', 'Coming soon'),
      t('home.coming_soon.message', 'We are polishing this tool for you. Stay tuned!'),
    );
  };

  return (
    <LinearGradient
      colors={GradientStyles.dark.colors}
      start={GradientStyles.dark.start}
      end={GradientStyles.dark.end}
      style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <View>
              <View style={styles.brandRow}>
                <Image source={require('../../assets/home/lbtitle.png')} style={styles.brandPrimary} resizeMode="contain" />
              </View>
              {/* <Text style={styles.subtitle}>{t('home.subtitle', 'Cut, merge, and edit audio in seconds')}</Text> */}
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconButton} onPress={handleVIPPress}>
                <Image source={require('../../assets/icon/vip.png')} style={styles.iconImage} resizeMode="contain" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handleSettingsPress}>
                <Image source={require('../../assets/icon/setting.png')} style={styles.iconImage} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.cardsScrollView}
          contentContainerStyle={styles.cardsScrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.mainContent}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.highlightCard}
              onPress={handleCutAudioPress}>
              <LinearGradient
                colors={['#8E5AF7', '#5C44F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.highlightBackground}>
                <View style={styles.highlightContent}>
                  <Text style={styles.highlightTitle} numberOfLines={2}>
                    {t(HIGHLIGHT_CARD.titleKey, HIGHLIGHT_CARD.fallbackTitle)}
                  </Text>
                  <View style={styles.highlightCta}>
                    <Text style={styles.highlightCtaText}>
                      {`${t(HIGHLIGHT_CARD.ctaKey, HIGHLIGHT_CARD.fallbackCta)} →`}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.featureGrid}>
              {FEATURE_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.featureCard}
                  activeOpacity={0.9}
                  onPress={() => handleFeatureSelect(item)}>
                  <View
                    style={styles.featureBackground}>
                    {item.requiresVip && (
                      <View style={styles.vipBadge}>
                        <Image source={require('../../assets/icon/vip.png')} style={styles.vipIcon} resizeMode="contain" />
                      </View>
                    )}
                    <Image source={item.image} style={styles.featureIcon} resizeMode="contain" />
                    <View style={styles.featureTextWrapper}>
                      <Text style={styles.featureTitle} numberOfLines={1}>{t(item.titleKey, item.fallbackTitle)}</Text>
                      {/* <Text style={styles.featureSubtitle} numberOfLines={2}>{t(item.subtitleKey, item.fallbackSubtitle)}</Text> */}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Native Ad at the bottom */}
        <View style={styles.adWrapper}>
          <NativeAdComponent
            adUnitId={ADS_UNIT.NATIVE_HOME} />
        </View>
      </View>

      <IAPModal
        visible={showIAPModal}
        onClose={handleCloseIAPModal}
        onPurchase={handlePurchase}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandPrimary: {
    // color: Colors.white,
    maxWidth: 150,
    height: 40,
    // fontSize: 28,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.backgroundLight,
    marginTop: 6,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 10,
    // padding: 6,
    paddingBottom: 6,
    // borderRadius: 8,
    // backgroundColor: 'rgba(255,255,255,0.06)'
  },
  iconImage: {
    width: 28,
    height: 28,
  },
  cardsScrollView: {
    flex: 1,
  },
  cardsScrollContent: {
    paddingBottom: 24,
  },
  mainContent: {
    paddingHorizontal: 20,
  },
  highlightCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  highlightBackground: {
    padding: 24,
    minHeight: 160,
    justifyContent: 'center',
    borderRadius: 20,
  },
  highlightContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  highlightTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 18,
  },
  highlightCta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  highlightCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 18,
    elevation: 4,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  featureBackground: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    textAlign: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  vipBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    // backgroundColor: 'rgba(0,0,0,0.18)',
    padding: 6,
    borderRadius: 12,
  },
  vipIcon: {
    width: 20,
    height: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    // marginBottom: 16,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 6,
  },
  featureSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.white,
  },
  adWrapper: {
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  headerContainer: {
    paddingHorizontal: 20,
    // paddingBottom: 10,
  },
});

export default HomeScreen;
