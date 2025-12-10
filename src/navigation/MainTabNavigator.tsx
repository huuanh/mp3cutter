import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { SCREEN_NAMES } from '../constants';
import { HomeScreen } from '../screens';
import { Colors } from '../constants/colors';

export type MainTabParamList = {
  [SCREEN_NAMES.HOME]: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.primary,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
      }}>
      <Tab.Screen 
        name={SCREEN_NAMES.HOME} 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <Text style={{ color: focused ? Colors.primary : Colors.gray }}>🏠</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;