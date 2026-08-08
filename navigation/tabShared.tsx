import React from 'react';
import HomeScreen from '@/Screens/Home/HomeScreen';
import LiveScreen from '@/Screens/Live/LiveScreen';
import UpcomingScreen from '@/Screens/Upcoming/UpcomingScreen';
import LibraryScreen from '@/Screens/Library/LibraryScreen';
import OrientationWrapper from '@/components/OrientationWrapper';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import routes from './routes';

export type BottomNavigator = {
  [routes.HOME_SCREEN]: undefined;
  [routes.LIVE_SCREEN]: undefined;
  [routes.UPCOMING_SCREEN]: undefined;
  [routes.LIBRARY_SCREEN]: undefined;
};

export type TabNavParams = NativeStackNavigationProp<BottomNavigator>;

export const HomeTabScreen = () => (
  <OrientationWrapper>
    {injectedProps => <HomeScreen {...injectedProps} />}
  </OrientationWrapper>
);

export const LiveTabScreen = () => (
  <OrientationWrapper>
    {injectedProps => <LiveScreen {...injectedProps} />}
  </OrientationWrapper>
);

export const UpcomingTabScreen = () => (
  <OrientationWrapper>
    {injectedProps => <UpcomingScreen {...injectedProps} />}
  </OrientationWrapper>
);

export const LibraryTabScreen = LibraryScreen;
