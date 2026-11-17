import {ActivityIndicator, Pressable, RefreshControl, SectionList, View} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppHeader, AppImage, AppScreen, AppText, AppView} from '@/components';
import { useAppDispatch, useAppSelector } from '@/Hooks/reduxHook';
import { selectGroupedNotifications, selectNotificationList, setNoticationsList, updateNotificationById } from '@/store/slices/userSlice';
import { INotification } from '@/types/api/notification.types';
import ToastNotification from '@/components/ToastNotifications';
import { getAllNotifications, markNotificationSeen } from '@/api/notification.api';
import { getNotificationTime } from '@/Utils/formatTime';
import {queueNotificationOpen} from '@/Utils/notificationNavigation';
import {useFocusEffect} from '@react-navigation/native';
import notifee from '@notifee/react-native';

const NotificationScreen = () => {
  const dispatch = useAppDispatch();
  const notificationsList = useAppSelector(selectGroupedNotifications);
  const notifications = useAppSelector(selectNotificationList);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const handleNotifications = useCallback(async (requestedPage = 1) => {
    try {
      setLoading(true);
      const res = await getAllNotifications({page: requestedPage, limit: 20});
      // console.log(res.data)
      if (res.ok && res.data) {
        const incoming = res.data.data;
        const current = notificationsRef.current;
        const existing = new Set(current.map(x => x._id));
        const merged = requestedPage === 1 ? incoming : [
          ...current,
          ...incoming.filter(x => !existing.has(x._id)),
        ];
        setHasMore(incoming.length === 20);
        dispatch(setNoticationsList(merged));
        setPage(requestedPage);
      } else {
        ToastNotification('error', `${res.data?.message}`);
        setHasMore(false);
      }
    } catch (error) {
      ToastNotification('error',`${error}`);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const loadMore = useCallback(() => {
    if (!hasMore || notifications.length < 20) return;
    handleNotifications(notifications.length >= page * 20 ? page + 1 : page);
  }, [handleNotifications, hasMore, notifications.length, page]);

  const sections = Object.entries(notificationsList).map(([date, data]) => ({title: date, data}));

  useFocusEffect(useCallback(() => {
    handleNotifications(1);
    notifee.setBadgeCount(0).catch(() => {});
  }, [handleNotifications]));

  return (
    <AppScreen containerStyle={{paddingTop: 30, position: 'relative'}}>
      <AppHeader style={{marginTop:5}} />
      <AppView className="absolute w-full items-center">
      <AppText className="font-MANROPE_700 text-white text-xl mt-1.5 mb-0">
        Notifications
      </AppText>
      </AppView>

      <AppView>
        <SectionList
        sections={sections}
        keyExtractor={item => item._id.toString()}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={1}
        onEndReached={loadMore}
        refreshControl={
          <RefreshControl
            refreshing={loading && page === 1}
            onRefresh={() => handleNotifications(1)}
            tintColor="#F54343"
            colors={['#F54343']}
          />
        }
        renderSectionHeader={() => null}
        renderItem={({item}) => <NotificationItem item={item} onRead={async () => {
          if (!item.hasSeen) {
            dispatch(updateNotificationById({id: item._id, data: {hasSeen: true}}));
            const result = await markNotificationSeen(item._id);
            if (!result.ok) {
              dispatch(updateNotificationById({id: item._id, data: {hasSeen: false}}));
            }
          }
          queueNotificationOpen({
            type: item.adminNotification.type,
            metadata: JSON.stringify(item.adminNotification.metadata ?? {}),
          });
        }} />}
        ListFooterComponent={
          <>
            {loading && notifications.length > 19 && (
              <AppView className="h-20 items-center justify-center">
                <ActivityIndicator size={'large'} />
              </AppView>
            )}
          </>
        }
        ListEmptyComponent={!loading ? (
          <AppView className="items-center justify-center pt-24 px-8">
            <AppText className="font-MANROPE_600 text-white text-base">No notifications yet</AppText>
            <AppText className="font-MANROPE_400 text-grey_200 text-sm text-center mt-2">
              Updates you choose to receive will appear here.
            </AppText>
          </AppView>
        ) : null}
      />
      </AppView>
    </AppScreen>
  );
};

export default NotificationScreen;

interface Props{
  item: INotification;
  onRead: () => void;
}

export const NotificationItem = ({item, onRead}:Props) =>{
  return <Pressable onPress={onRead} className={`mb-[13px] flex-row items-start ${item.hasSeen ? 'opacity-70' : ''}`}>
              <View className="w-[145px] h-[83px] rounded overflow-hidden">
                <AppImage
                  source={item.photoUri ?{uri:item.photoUri}:require('@/assets/images/NotificationBanner.png')}
                  style={{width:145, height:83}}
                />
              </View>

              <AppView className="ml-5 flex-1">
                <AppText className="text-grey_100 font-LEXEND_700 text-xs">
                  {item.adminNotification.title}
                </AppText>
                <AppText className="font-MANROPE_400 text-xs text-white">
                  {item.adminNotification.description}
                </AppText>
                <AppText className="font-MANROPE_500 text-[13px] text-yellow mt-[2px]">
                  {getNotificationTime(item.createdAt)}
                </AppText>
              </AppView>
            </Pressable>
}
