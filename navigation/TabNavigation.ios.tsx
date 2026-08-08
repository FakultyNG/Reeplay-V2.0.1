import React from 'react';
import {createNativeBottomTabNavigator} from '@react-navigation/bottom-tabs/unstable';
import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import {useAppSelector} from '@/Hooks/reduxHook';
import {selectHideTabBar} from '@/store/slices/userSlice';
import routes from './routes';
import {
  HomeTabScreen,
  LibraryTabScreen,
  LiveTabScreen,
  UpcomingTabScreen,
} from './tabShared';

const Tab = createNativeBottomTabNavigator();

/**
 * iOS native tabs — liquid glass / mirror blur on iOS 26+ (Xcode 26+),
 * systemMaterialDark blur on older iOS.
 */
const TabNavigation = () => {
  const hideTabBar = useAppSelector(selectHideTabBar);

  return (
    <Tab.Navigator
      initialRouteName={routes.HOME_SCREEN}
      tabBarHidden={hideTabBar}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.RED,
        tabBarInactiveTintColor: colors.GREY_100,
        tabBarBlurEffect: 'systemMaterialDark',
        tabBarStyle: {
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
        },
        tabBarLabelStyle: {
          fontFamily: fonts.ROBOTO_700,
          fontSize: 11,
        },
      }}>
      <Tab.Screen
        name={routes.HOME_SCREEN}
        component={HomeTabScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({focused}) => ({
            type: 'sfSymbol',
            name: focused ? 'house.fill' : 'house',
          }),
        }}
      />
      <Tab.Screen
        name={routes.LIVE_SCREEN}
        component={LiveTabScreen}
        options={{
          title: 'Live',
          tabBarIcon: ({focused}) => ({
            type: 'sfSymbol',
            name: focused ? 'tv.fill' : 'tv',
          }),
        }}
      />
      <Tab.Screen
        name={routes.UPCOMING_SCREEN}
        component={UpcomingTabScreen}
        options={{
          title: 'Upcoming',
          tabBarIcon: ({focused}) => ({
            type: 'sfSymbol',
            name: focused ? 'calendar.circle.fill' : 'calendar',
          }),
        }}
      />
      <Tab.Screen
        name={routes.LIBRARY_SCREEN}
        component={LibraryTabScreen}
        options={{
          title: 'Library',
          tabBarIcon: ({focused}) => ({
            type: 'sfSymbol',
            name: focused ? 'rectangle.stack.fill' : 'rectangle.stack',
          }),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigation;
export type {BottomNavigator, TabNavParams} from './tabShared';
