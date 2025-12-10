import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SCREEN_NAMES, ASYNC_STORAGE_KEYS } from '../constants';
import {
  LoadingScreen,
  LanguageSelectionScreen,
  OnboardingScreen,
  HomeScreen,
  SettingsScreen,
  CutAudioScreen,
} from '../screens';

export type RootStackParamList = {
  [SCREEN_NAMES.LOADING]: undefined;
  [SCREEN_NAMES.LANGUAGE_SELECTION]: { fromSettings?: boolean };
  [SCREEN_NAMES.ONBOARDING]: undefined;
  [SCREEN_NAMES.HOME]: undefined;
  [SCREEN_NAMES.SETTINGS]: undefined;
  [SCREEN_NAMES.CUT_AUDIO]: {
    uri: string;
    name: string;
    size: number;
    type: string;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={SCREEN_NAMES.LOADING}
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name={SCREEN_NAMES.LOADING} component={LoadingScreen} />
        <Stack.Screen name={SCREEN_NAMES.LANGUAGE_SELECTION} component={LanguageSelectionScreen} />
        <Stack.Screen name={SCREEN_NAMES.ONBOARDING} component={OnboardingScreen} />
        <Stack.Screen name={SCREEN_NAMES.HOME} component={HomeScreen} />
        <Stack.Screen name={SCREEN_NAMES.SETTINGS} component={SettingsScreen} />
        <Stack.Screen name={SCREEN_NAMES.CUT_AUDIO} component={CutAudioScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;