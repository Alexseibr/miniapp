import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeFeedScreen from '../screens/HomeFeedScreen';
import AdDetailsScreen from '../screens/AdDetailsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FiltersScreen from '../screens/FiltersScreen';
import { Text } from 'react-native';

export type HomeStackParamList = {
  HomeFeed: undefined;
  AdDetails: { adId: string };
  Filters: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeFeed" component={HomeFeedScreen} />
    <HomeStack.Screen name="AdDetails" component={AdDetailsScreen} />
    <HomeStack.Screen name="Filters" component={FiltersScreen} />
  </HomeStack.Navigator>
);

export type AppTabParamList = {
  Home: undefined;
  Map: undefined;
  Favorites: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabel: ({ children }) => <Text>{children}</Text>,
      }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ title: 'Лента' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Карта' }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Избранное' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
