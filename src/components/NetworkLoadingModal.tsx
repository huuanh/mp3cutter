import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, GradientStyles } from '../constants/colors';
import { useTranslation } from '../hooks/useTranslation';

interface NetworkLoadingModalProps {
  visible: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
}

const NetworkLoadingModal: React.FC<NetworkLoadingModalProps> = ({
  visible,
  isRetrying = false,
  onRetry,
}) => {
  const { t } = useTranslation();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Start rotation animation when modal is visible
      const rotateAnimation = Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();

      return () => {
        rotateAnimation.stop();
      };
    }
  }, [visible, animatedValue]);

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent={true}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={GradientStyles.dark.colors}
          start={GradientStyles.dark.start}
          end={GradientStyles.dark.end}
          style={styles.container}>
          
          <View style={styles.content}>
            {/* WiFi Icon with Animation */}
            <View style={styles.iconContainer}>
              <Animated.View
                style={[
                  styles.iconWrapper,
                  {
                    transform: [{ rotate }],
                  },
                ]}>
                <Image
                  source={require('../../assets/icon/setting.png')}
                  style={styles.wifiIcon}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {t('network.no_connection_title', 'No Internet Connection')}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {t(
                'network.no_connection_message',
                'Please check your internet connection and try again. This app requires internet to function properly.'
              )}
            </Text>

            {/* Status Text */}
            <Text style={styles.statusText}>
              {isRetrying
                ? t('network.retrying', 'Checking connection...')
                : t('network.waiting', 'Waiting for connection...')}
            </Text>

            {/* Retry Button */}
            {onRetry && (
              <TouchableOpacity
                style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
                onPress={onRetry}
                disabled={isRetrying}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={isRetrying ? ['#666', '#444'] : ['#4CAF50', '#2E7D32']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.retryButtonGradient}>
                  <Text style={styles.retryButtonText}>
                    {isRetrying
                      ? t('network.retrying_button', 'Checking...')
                      : t('network.retry_button', 'Try Again')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Connection Tips */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>
                {t('network.tips_title', 'Connection Tips:')}
              </Text>
              <Text style={styles.tipsText}>
                • {t('network.tip_wifi', 'Check your WiFi connection')}
              </Text>
              <Text style={styles.tipsText}>
                • {t('network.tip_mobile', 'Try switching to mobile data')}
              </Text>
              <Text style={styles.tipsText}>
                • {t('network.tip_airplane', 'Turn off Airplane mode')}
              </Text>
              <Text style={styles.tipsText}>
                • {t('network.tip_restart', 'Restart your router or device')}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    backgroundColor: 'rgba(42, 33, 40, 0.95)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  wifiIcon: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  statusText: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 25,
    fontStyle: 'italic',
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 25,
    elevation: 5,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    alignItems: 'center',
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  tipsContainer: {
    alignSelf: 'stretch',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 10,
  },
  tipsText: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 5,
    lineHeight: 18,
  },
});

export default NetworkLoadingModal;