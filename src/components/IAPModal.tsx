import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../constants/colors';
import { useTranslation } from '../hooks/useTranslation';
import IAPManager, { IAP_PRODUCTS } from '../utils/IAPManager';
import type { Product, Purchase } from 'react-native-iap';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface IAPModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchase: () => void;
}

const IAPModal: React.FC<IAPModalProps> = ({
  visible,
  onClose,
  onPurchase,
}) => {
  const { t } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize IAP and load product data
  useEffect(() => {
    if (visible) {
      loadProductData();
    }
    
    // Cleanup function
    return () => {
      if (visible) {
        const iapManager = IAPManager.getInstance();
        // Remove any lingering callbacks when component unmounts
        iapManager.removePurchaseSuccessCallback(() => {});
        iapManager.removePurchaseErrorCallback(() => {});
      }
    };
  }, [visible]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get IAP Manager instance
      const iapManager = IAPManager.getInstance();
      
      // Initialize if not already done
      if (!iapManager.isReady()) {
        const initialized = await iapManager.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize IAP');
        }
      }

      // Wait a bit for products to load
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      
      // Get the lifetime product
      const products = iapManager.getInApp();
      console.log('🔍 Searching for product ID:', IAP_PRODUCTS.IAP_LIFETIME);
      console.log('🔍 Available products:', products);
      
      const lifetimeProduct = products.find(p => {
        const productId = (p as any).productId || (p as any).productIds || (p as any).sku || (p as any).id;
        console.log('🔍 Checking product ID:', productId);
        return productId === IAP_PRODUCTS.IAP_LIFETIME;
      });
      
      if (lifetimeProduct) {
        setProduct(lifetimeProduct);
        console.log('✅ Product loaded:', lifetimeProduct);
      } else {
        console.log('⚠️ Product not found in store');
        // Also try to check subscriptions in case it's misconfigured
        const subscriptions = iapManager.getSubscriptions();
        console.log('🔍 Checking subscriptions as fallback:', subscriptions);
        const subProduct = subscriptions.find(s => {
          const productId = (s as any).productId || (s as any).productIds || (s as any).sku;
          return productId === IAP_PRODUCTS.IAP_LIFETIME;
        });
        
        if (subProduct) {
          setProduct(subProduct as any);
          console.log('✅ Product found in subscriptions:', subProduct);
        } else {
          console.log('❌ Product not found anywhere');
          setError(t('iap.product_not_available'));
        }
        
        // Log all available products for debugging
        console.log('Available products:', products);
        console.log('Available subscriptions:', subscriptions);
        iapManager.logAllItems();
      }
    } catch (error) {
      console.error('❌ Error loading product data:', error);
      setError(t('iap.failed_to_load'));
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = useCallback(async () => {
    if (!product || purchasing) return;
    
    try {
      setPurchasing(true);
      setError(null);
      
      const iapManager = IAPManager.getInstance();
      
      // Add success callback
      const onPurchaseSuccess = (purchase: Purchase) => {
        console.log('✅ Purchase successful:', purchase);
        setPurchasing(false);
        onPurchase(); // Call parent callback
        onClose(); // Close modal
        // Remove callback to prevent memory leaks
        iapManager.removePurchaseSuccessCallback(onPurchaseSuccess);
      };
      
      // Add error callback
      const onPurchaseError = (error: any) => {
        console.error('❌ Purchase error:', error);
        setPurchasing(false);
        
        let errorMessage = t('iap.purchase_failed');
        if (error.code === 'USER_CANCELED' || error.responseCode === 1) {
          errorMessage = t('iap.purchase_cancelled');
        } else if (error.code === 'ITEM_ALREADY_OWNED' || error.responseCode === 7) {
          errorMessage = t('iap.item_already_owned');
        } else if (error.code === 'ITEM_UNAVAILABLE' || error.responseCode === 4) {
          errorMessage = t('iap.item_unavailable');
        }
        
        setError(errorMessage);
        
        // Show alert for user feedback
        Alert.alert(t('iap.purchase_error'), errorMessage);
        
        // Remove callback to prevent memory leaks
        iapManager.removePurchaseErrorCallback(onPurchaseError);
      };
      
      // Register callbacks
      iapManager.addPurchaseSuccessCallback(onPurchaseSuccess);
      iapManager.addPurchaseErrorCallback(onPurchaseError);
      
      // Request purchase
      const productId = (product as any).productId || 
                       (product as any).productIds || 
                       (product as any).sku ||
                       IAP_PRODUCTS.IAP_LIFETIME; // fallback to the configured ID
      
      console.log('🛒 Requesting purchase for product ID:', productId);
      await iapManager.requestPurchase(productId);
      
    } catch (error) {
      console.error('❌ Purchase request failed:', error);
      setPurchasing(false);
      setError(t('iap.failed_to_start'));
      Alert.alert(t('iap.error'), t('iap.failed_to_start'));
    }
  }, [product, purchasing, onPurchase, onClose]);

  // Format price for display
  const getDisplayPrice = (): string => {
    if (product) {
      // Try different price properties
      const price = (product as any).price || 
                   (product as any).localizedPrice || 
                   (product as any).priceAmountMicros;

      if(product.displayPrice) {
        return product.displayPrice;
      }
      
      if (price) {
        // If it's already a formatted string (like "$4.99"), return it
        if (typeof price === 'string') {
          return price;
        }
        // If it's a number in micros (Google Play format), convert it
        if (typeof price === 'number' && price > 1000) {
          const actualPrice = price;
          const currency = getCurrency();
          return `${actualPrice.toFixed(2)} ${currency}`;
        }
        // If it's a regular number
        if (typeof price === 'number') {
          const currency = getCurrency();
          return `${price.toFixed(2)} ${currency}`;
        }
      }
    }
    return '$4.99'; // Fallback price
  };

  // Get currency symbol
  const getCurrency = (): string => {
    if (product) {
      const currency = (product as any).currency || 
                      (product as any).priceCurrencyCode;
      if (currency) {
        // Convert currency code to symbol
        switch (currency) {
          case 'USD': return '$';
          case 'EUR': return '€';
          case 'GBP': return '£';
          case 'JPY': return '¥';
          case 'VND': return '₫';
          default: return currency;
        }
      }
    }
    return '$';
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background with cover image */}
      <View style={styles.container}>
        <Image
          source={require('../../assets/setting/i_cover.png')}
          style={styles.coverImage}
          resizeMode="cover"
        />
        
        {/* Overlay gradient */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.overlay}
        />
        
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
        
        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.premiumText}>{t('iap.title')}</Text>
            <Text style={styles.premiumSubText}>{t('iap.premium')}</Text>
          </View>
          
          {/* Main title */}
          <Text style={styles.mainTitle}>{t('iap.buy_once_use_forever')}</Text>
          
          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Text style={styles.checkMark}>✓</Text>
              <Text style={styles.featureText}>{t('iap.unlock_all_sounds')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.checkMark}>✓</Text>
              <Text style={styles.featureText}>{t('iap.remove_ads')}</Text>
            </View>
          </View>
          
          {/* Loading state */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.white} size="large" />
              <Text style={styles.loadingText}>{t('iap.loading_product')}</Text>
            </View>
          )}
          
          {/* Error state */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={loadProductData}
              >
                <Text style={styles.retryButtonText}>{t('iap.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Price - Show only when product is loaded and no error */}
          {!loading && !error && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>{getDisplayPrice()}</Text>
              <Text style={styles.priceSubText}>{t('iap.one_time_purchase')}</Text>
            </View>
          )}
          
          {/* Buy button */}
          <TouchableOpacity
            style={[
              styles.buyButton,
              (loading || purchasing || error) && styles.buyButtonDisabled
            ]}
            onPress={handlePurchase}
            disabled={loading || purchasing || !!error || !product}
          >
            <LinearGradient
              colors={
                loading || purchasing || error 
                  ? ['#666666', '#444444'] 
                  : ['#E879F9', '#A855F7']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buyButtonGradient}
            >
              {purchasing ? (
                <View style={styles.purchasingContainer}>
                  <ActivityIndicator color={Colors.white} size="small" />
                  <Text style={[styles.buyButtonText, { marginLeft: 10 }]}>{t('iap.processing')}</Text>
                </View>
              ) : (
                <Text style={styles.buyButtonText}>{t('iap.buy_now')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            {t('iap.disclaimer')}{' '}
            <Text style={styles.linkText}>{t('iap.terms_of_use')}</Text> and{' '}
            <Text style={styles.linkText}>{t('iap.privacy_policy')}</Text>
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2A2128',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight * 0.68,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 5,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  premiumText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  premiumSubText: {
    color: '#A855F7',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  mainTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 1,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkMark: {
    color: '#A855F7',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 15,
    width: 20,
  },
  featureText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#A855F7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  priceText: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  priceSubText: {
    color: Colors.gray,
    fontSize: 14,
  },
  buyButton: {
    marginBottom: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  buyButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buyButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  disclaimer: {
    color: Colors.gray,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: '#A855F7',
    textDecorationLine: 'underline',
  },
  // New styles for IAP functionality
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  loadingText: {
    color: Colors.white,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#A855F7',
    borderRadius: 20,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  purchasingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IAPModal;