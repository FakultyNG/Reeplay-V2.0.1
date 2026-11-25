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
import {useLiveFeatureStore} from '@/store/liveFeature.store';

const Tab = createBottomTabNavigator();

/**
 * Android (and JS) tabs — Telegram-style floating frosted pill.
 */
const TabNavigation = () => {
  const hideTabBar = useAppSelector(selectHideTabBar);
  const liveEnabled = useLiveFeatureStore(state => state.enabled);

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
      {liveEnabled ? (
        <Tab.Screen name={routes.LIVE_SCREEN} component={LiveTabScreen} />
      ) : null}
      <Tab.Screen name={routes.UPCOMING_SCREEN} component={UpcomingTabScreen} />
      <Tab.Screen name={routes.LIBRARY_SCREEN} component={LibraryTabScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigation;
export type {BottomNavigator, TabNavParams} from './tabShared';
