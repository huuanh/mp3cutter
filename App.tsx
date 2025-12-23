/**
 * Hair Clipper Prank App
 * 
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';
import firebase from '@react-native-firebase/app';

import RootNavigator from './src/navigation/RootNavigator';
import { NetworkLoadingModal } from './src/components';
import { useNetworkConnection } from './src/hooks/useNetworkConnection';

function App() {
  const { isConnected, isRetrying, retryConnection } = useNetworkConnection();
  // const insets = useSafeAreaInsets();

  useEffect(() => {
    // Initialize Firebase if not already initialized
    const initializeFirebase = async () => {
      try {
        // Check if Firebase is already configured
        if (!firebase.apps.length) {
          console.log('🚀 Initializing Firebase app...');
          // Firebase will be initialized automatically with google-services.json on Android
          // We just need to verify it's working
        }
        
        // Verify Firebase app is available
        const app = firebase.app();
        console.log('✅ Firebase app ready:', app.name, 'Options:', !!app.options);
        
        // Test if Firebase services are available
        console.log('🔍 Firebase app options available:', !!app.options);
        
      } catch (error) {
        console.error('❌ Firebase initialization error:', error);
      }
    };

    initializeFirebase();
  }, []);

  return (
    <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#2A2128" />
        
        {/* Main App Content - only render when connected */}
        {isConnected && <RootNavigator />}
        
        {/* Network Loading Modal - show when disconnected */}
        <NetworkLoadingModal
          visible={!isConnected}
          isRetrying={isRetrying}
          onRetry={retryConnection}
        />
    </SafeAreaProvider>
  );
}

export default App;
