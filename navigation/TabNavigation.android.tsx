import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View} from 'react-native';
import {useAppSelector} from '@/Hooks/reduxHook';
import {selectHideTabBar} from '@/store/slices/userSlice';
import MyTabBar from './components/TabView';
import routes from './routes';
import {
  HomeTabScreen,
  LibraryTabScreen,
  LiveTabScreen,
  UpcomingTabScreen,
} from './tabShared';

const Tab = createBottomTabNavigator();

/**
 * Android (and JS) tabs — Telegram-style floating frosted pill.
 */
const TabNavigation = () => {
  const hideTabBar = useAppSelector(selectHideTabBar);

  return (
    <Tab.Navigator
      initialRouteName={routes.HOME_SCREEN}
      tabBar={props =>
        hideTabBar ? null : (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'transparent',
            }}>
            <MyTabBar {...props} />
          </View>
        )
      }
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 0,
          elevation: 0,
        },
      }}>
      <Tab.Screen name={routes.HOME_SCREEN} component={HomeTabScreen} />
      <Tab.Screen name={routes.LIVE_SCREEN} component={LiveTabScreen} />
      <Tab.Screen name={routes.UPCOMING_SCREEN} component={UpcomingTabScreen} />
      <Tab.Screen name={routes.LIBRARY_SCREEN} component={LibraryTabScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigation;
export type {BottomNavigator, TabNavParams} from './tabShared';
