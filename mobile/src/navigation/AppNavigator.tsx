import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeFeedScreen } from '../screens/HomeFeedScreen';
import { MapScreen } from '../screens/MapScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AdDetailsScreen } from '../screens/AdDetailsScreen';
import { CreateAdScreen } from '../screens/CreateAdScreen';
import { CreateAdStepLocationScreen } from '../screens/CreateAdStepLocationScreen';

export type RootStackParamList = {
  Tabs: undefined;
  AdDetails: { adId: string };
  CreateAd: undefined;
  CreateAdLocation: undefined;
};

export type TabParamList = {
  Home: undefined;
  Map: undefined;
  Favorites: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const Tabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#0f1217', borderTopColor: '#1f2937' },
      tabBarActiveTintColor: '#00f5d4',
      tabBarInactiveTintColor: '#6b7280'
    }}
  >
    <Tab.Screen name="Home" component={HomeFeedScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="home" size={20} color={color} /> }} />
    <Tab.Screen name="Map" component={MapScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="map" size={20} color={color} /> }} />
    <Tab.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ tabBarIcon: ({ color }) => <Ionicons name="heart" size={20} color={color} /> }}
    />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <Ionicons name="person" size={20} color={color} /> }} />
  </Tab.Navigator>
);

export const AppNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
    <Stack.Screen name="AdDetails" component={AdDetailsScreen} options={{ title: 'Объявление' }} />
    <Stack.Screen name="CreateAd" component={CreateAdScreen} options={{ title: 'Новое объявление' }} />
    <Stack.Screen name="CreateAdLocation" component={CreateAdStepLocationScreen} options={{ title: 'Локация' }} />
  </Stack.Navigator>
);
