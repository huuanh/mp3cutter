import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../constants/colors';
import { useTranslation } from '../hooks/useTranslation';

const { width: screenWidth } = Dimensions.get('window');

interface NeedVipModalProps {
  visible: boolean;
  onClose: () => void;
  onWatchAds: () => void;
  onGoPremium: () => void;
  itemType?: string; // 'Sound type', 'Hair Clipper', 'Hair Dryer'
}

const NeedVipModal: React.FC<NeedVipModalProps> = ({
  visible,
  onClose,
  onWatchAds,
  onGoPremium,
  itemType = 'Sound type',
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          {/* Premium Icon */}
          <View style={styles.iconContainer}>
              <View style={styles.crownContainer}>
                <Image
                  source={require('../../assets/icon/needvip.png')}
                  style={styles.crownIcon}
                  resizeMode="contain"
                />
              </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('needvip.unlock_premium')}</Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {t('needvip.watch_video_to_unlock') + { itemType }}
          </Text>

          {/* Watch Ads Button */}
          <TouchableOpacity
            style={styles.watchAdsButton}
            onPress={onWatchAds}
            activeOpacity={0.8}
          >
            <View style={styles.watchAdsContent}>
              <Image
                source={require('../../assets/icon/vid.png')}
                style={styles.videoIcon}
                resizeMode="contain"
              />
              <Text style={styles.watchAdsText}>{t('needvip.watch_ads')}</Text>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('needvip.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Go Premium Button */}
          <TouchableOpacity
            style={styles.goPremiumButton}
            onPress={onGoPremium}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#E879F9', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumGradient}
            >
              <Image
                source={require('../../assets/icon/vip.png')}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
              <Text style={styles.goPremiumText}>{t('needvip.go_premium')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Description */}
          <Text style={styles.description}>
            {t('needvip.unlimited_access_description')}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#2A2128',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '300',
  },
  iconContainer: {
    marginBottom: 20,
  },
  crownContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  crownIcon: {
    width: 90,
    height: 90,
    // tintColor: '#2A2128',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  watchAdsButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 25,
    paddingVertical: 8,
    marginBottom: 20,
  },
  watchAdsContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  watchAdsText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray,
    opacity: 0.3,
  },
  dividerText: {
    color: Colors.gray,
    fontSize: 14,
    marginHorizontal: 15,
  },
  goPremiumButton: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 20,
  },
  premiumGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  premiumIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
    tintColor: Colors.white,
  },
  goPremiumText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NeedVipModal;