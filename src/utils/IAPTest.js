/**
 * IAP Test Utility
 * Run this to test IAP functionality
 */

import IAPManager, { IAP_PRODUCTS } from './IAPManager';
import VIPManager from './VIPManager';

class IAPTest {
  static async runTests() {
    console.log('🧪 Starting IAP Tests...');
    
    try {
      // Test 1: Initialize IAP Manager
      console.log('🧪 Test 1: Initialize IAP Manager');
      const iapManager = IAPManager.getInstance();
      const initialized = await iapManager.initialize();
      console.log('✅ IAP Manager initialized:', initialized);
      
      if (!initialized) {
        console.error('❌ IAP Manager initialization failed');
        return;
      }
      
      // Test 2: Load products
      console.log('🧪 Test 2: Load products');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for products to load
      
      const products = iapManager.getInApp();
      const subscriptions = iapManager.getSubscriptions();
      console.log('✅ Products loaded:', products.length);
      console.log('✅ Subscriptions loaded:', subscriptions.length);
      
      // Test 3: Log all items
      console.log('🧪 Test 3: Log all items');
      iapManager.logAllItems();
      
      // Test 4: Check for specific product
      console.log('🧪 Test 4: Check for specific product');
      const targetProduct = products.find(p => {
        const productId = p.productId || p.productIds || p.sku;
        return productId === IAP_PRODUCTS.IAP_LIFETIME;
      });
      
      if (targetProduct) {
        console.log('✅ Target product found:', targetProduct);
        console.log('📦 Product details:');
        console.log('  - ID:', targetProduct.productId || targetProduct.productIds || targetProduct.sku);
        console.log('  - Price:', targetProduct.price || targetProduct.localizedPrice);
        console.log('  - Currency:', targetProduct.currency || targetProduct.priceCurrencyCode);
        console.log('  - Title:', targetProduct.title);
        console.log('  - Description:', targetProduct.description);
      } else {
        console.log('❌ Target product not found');
        console.log('📋 Available products:');
        products.forEach(p => {
          console.log('  -', p.productId || p.productIds || p.sku, ':', p.title);
        });
      }
      
      // Test 5: Initialize VIP Manager
      console.log('🧪 Test 5: Initialize VIP Manager');
      const vipManager = VIPManager.getInstance();
      await vipManager.initialize();
      
      const vipStatus = vipManager.getIsVip();
      console.log('✅ VIP status:', vipStatus);
      
      // Test 6: Refresh entitlements
      console.log('🧪 Test 6: Refresh entitlements');
      await iapManager.refreshEntitlements();
      const updatedVipStatus = vipManager.getIsVip();
      console.log('✅ Updated VIP status:', updatedVipStatus);
      
      console.log('🎉 All IAP tests completed successfully!');
      
    } catch (error) {
      console.error('❌ IAP Test failed:', error);
    }
  }
  
  static async testPurchaseFlow() {
    console.log('🧪 Testing Purchase Flow...');
    
    try {
      const iapManager = IAPManager.getInstance();
      
      if (!iapManager.isReady()) {
        console.log('⚠️ IAP Manager not ready, initializing...');
        await iapManager.initialize();
      }
      
      // Add test callbacks
      const onSuccess = (purchase) => {
        console.log('✅ Purchase success callback triggered:', purchase);
      };
      
      const onError = (error) => {
        console.log('❌ Purchase error callback triggered:', error);
      };
      
      iapManager.addPurchaseSuccessCallback(onSuccess);
      iapManager.addPurchaseErrorCallback(onError);
      
      // Test purchase request (this will show the actual purchase dialog)
      console.log('🛒 Requesting purchase for:', IAP_PRODUCTS.IAP_LIFETIME);
      await iapManager.requestPurchase(IAP_PRODUCTS.IAP_LIFETIME);
      
    } catch (error) {
      console.error('❌ Purchase flow test failed:', error);
    }
  }
  
  static logProductInfo() {
    const iapManager = IAPManager.getInstance();
    
    console.log('📊 IAP Manager Status:');
    console.log('  - Ready:', iapManager.isReady());
    console.log('  - VIP:', iapManager.getIsVip());
    
    const products = iapManager.getInApp();
    const subscriptions = iapManager.getSubscriptions();
    
    console.log('📦 Products (' + products.length + '):');
    products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.productId || product.sku}`);
      console.log(`     Title: ${product.title}`);
      console.log(`     Price: ${product.price || product.localizedPrice}`);
      console.log(`     Currency: ${product.currency || product.priceCurrencyCode}`);
    });
    
    console.log('📋 Subscriptions (' + subscriptions.length + '):');
    subscriptions.forEach((sub, index) => {
      console.log(`  ${index + 1}. ${sub.productId || sub.sku}`);
      console.log(`     Title: ${sub.title}`);
      console.log(`     Price: ${sub.price || sub.localizedPrice}`);
    });
    
    const vipManager = VIPManager.getInstance();
    console.log('👑 VIP Manager Status:');
    console.log('  - VIP:', vipManager.getIsVip());
    console.log('  - Info:', vipManager.getVipInfo());
  }
}

export default IAPTest;

// For quick testing in console:
// import IAPTest from './src/utils/IAPTest';
// IAPTest.runTests();
// IAPTest.logProductInfo();
// IAPTest.testPurchaseFlow(); // Only run this when you want to test actual purchase