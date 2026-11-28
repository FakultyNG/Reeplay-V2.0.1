import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, RefreshControl, SectionList, StyleSheet, View} from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import {useFocusEffect} from '@react-navigation/native';
import notifee from '@notifee/react-native';

import {AppHeader, AppImage, AppScreen, AppText} from '@/components';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {
  clearNotifications, markAllNotificationsRead, removeNotificationById,
  restoreNotification, selectNotificationList, setNoticationsList,
  setUnreadNotificationCount, updateNotificationById,
} from '@/store/slices/userSlice';
import {INotification} from '@/types/api/notification.types';
import {
  clearAllNotifications, deleteNotification, getAllNotifications,
  getUnreadNotificationCount, markAllNotificationsSeen, setNotificationSeen,
} from '@/api/notification.api';
import {getNotificationTime} from '@/Utils/formatTime';
import {queueNotificationOpen} from '@/Utils/notificationNavigation';
import ToastNotification from '@/components/ToastNotifications';

type PendingDelete = {notification: INotification; index: number; timer: ReturnType<typeof setTimeout>};

const dayLabel = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((today.getTime() - target.getTime()) / 86400000);
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : 'Earlier';
};

const NotificationScreen = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotificationList);
  const notificationsRef = useRef(notifications);
  const pendingRef = useRef<PendingDelete | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pending, setPending] = useState<PendingDelete | null>(null);

  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  const commitPendingDelete = useCallback(async () => {
    const current = pendingRef.current;
    if (!current) return;
    clearTimeout(current.timer);
    pendingRef.current = null;
    setPending(null);
    const result = await deleteNotification(current.notification._id);
    if (!result.ok) {
      dispatch(restoreNotification(current));
      ToastNotification('error', result.data?.message || 'Could not delete notification');
    }
  }, [dispatch]);

  useEffect(() => () => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer);
      void deleteNotification(pendingRef.current.notification._id);
    }
  }, []);

  const fetchNotifications = useCallback(async (requestedPage = 1) => {
    try {
      setLoading(true);
      const response = await getAllNotifications({page: requestedPage, limit: 20});
      if (!response.ok || !response.data) {
        ToastNotification('error', response.data?.message || 'Could not load notifications');
        setHasMore(false);
        return;
      }
      const incoming = response.data.data;
      const current = notificationsRef.current;
      const ids = new Set(current.map(item => item._id));
      dispatch(setNoticationsList(requestedPage === 1 ? incoming : [
        ...current, ...incoming.filter(item => !ids.has(item._id)),
      ]));
      setPage(requestedPage);
      setHasMore(incoming.length === 20);
      if (requestedPage === 1) {
        const unread = await getUnreadNotificationCount();
        if (unread.ok && unread.data) dispatch(setUnreadNotificationCount(unread.data.data.count));
      }
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(useCallback(() => {
    void fetchNotifications(1);
    void notifee.setBadgeCount(0);
  }, [fetchNotifications]));

  const sections = useMemo(() => {
    const groups: Record<string, INotification[]> = {Today: [], Yesterday: [], Earlier: []};
    notifications.forEach(item => groups[dayLabel(item.createdAt)].push(item));
    return Object.entries(groups).filter(([, data]) => data.length).map(([title, data]) => ({title, data}));
  }, [notifications]);

  const changeSeen = useCallback(async (item: INotification, hasSeen: boolean) => {
    if (item.hasSeen === hasSeen) return;
    dispatch(updateNotificationById({id: item._id, data: {hasSeen}}));
    const result = await setNotificationSeen(item._id, hasSeen);
    if (!result.ok) {
      dispatch(updateNotificationById({id: item._id, data: {hasSeen: item.hasSeen}}));
      ToastNotification('error', 'Could not update notification');
    }
  }, [dispatch]);

  const removeOne = useCallback(async (item: INotification) => {
    await commitPendingDelete();
    const index = notificationsRef.current.findIndex(entry => entry._id === item._id);
    dispatch(removeNotificationById(item._id));
    const timer = setTimeout(() => void commitPendingDelete(), 4500);
    const next = {notification: item, index, timer};
    pendingRef.current = next;
    setPending(next);
  }, [commitPendingDelete, dispatch]);

  const undoDelete = useCallback(() => {
    const current = pendingRef.current;
    if (!current) return;
    clearTimeout(current.timer);
    dispatch(restoreNotification(current));
    pendingRef.current = null;
    setPending(null);
  }, [dispatch]);

  const markAll = useCallback(async () => {
    if (!notifications.some(item => !item.hasSeen)) return;
    dispatch(markAllNotificationsRead());
    const result = await markAllNotificationsSeen();
    if (!result.ok) {
      ToastNotification('error', 'Could not mark all notifications as read');
      void fetchNotifications(1);
    }
  }, [dispatch, fetchNotifications, notifications]);

  const clearAll = useCallback(() => Alert.alert(
    'Clear notifications?', 'This permanently removes every notification.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Clear all', style: 'destructive', onPress: async () => {
        if (pendingRef.current) {
          clearTimeout(pendingRef.current.timer);
          pendingRef.current = null;
          setPending(null);
        }
        const snapshot = notificationsRef.current;
        dispatch(clearNotifications());
        const result = await clearAllNotifications();
        if (!result.ok) {
          dispatch(setNoticationsList(snapshot));
          ToastNotification('error', 'Could not clear notifications');
        }
      }},
    ],
  ), [dispatch]);

  return (
    <AppScreen containerStyle={styles.screen}>
      <AppHeader label="Notifications" />
      {notifications.length > 0 && <View style={styles.topActions}>
        <Pressable onPress={markAll} hitSlop={10}><AppText style={styles.actionText}>Mark all as read</AppText></Pressable>
        <Pressable onPress={clearAll} hitSlop={10}><AppText style={[styles.actionText, styles.dangerText]}>Clear all</AppText></Pressable>
      </View>}
      <SectionList
        sections={sections}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={sections.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={loading && page === 1} onRefresh={() => fetchNotifications(1)} tintColor="#F54343" />}
        onEndReached={() => {
          if (!loading && hasMore && notifications.length >= 20) void fetchNotifications(page + 1);
        }}
        onEndReachedThreshold={0.5}
        renderSectionHeader={({section}) => <AppText style={styles.sectionTitle}>{section.title}</AppText>}
        renderItem={({item}) => <NotificationRow
          item={item}
          onToggleSeen={() => void changeSeen(item, !item.hasSeen)}
          onDelete={() => void removeOne(item)}
          onOpen={() => {
            void changeSeen(item, true);
            queueNotificationOpen({type: item.adminNotification.type, metadata: JSON.stringify(item.adminNotification.metadata ?? {})});
          }}
        />}
        ListFooterComponent={loading && page > 1 ? <ActivityIndicator style={styles.loader} color="#F54343" /> : null}
        ListEmptyComponent={!loading ? <View style={styles.empty}>
          <View style={styles.emptyMark}><AppText style={styles.emptyMarkText}>R</AppText></View>
          <AppText style={styles.emptyTitle}>You’re all caught up</AppText>
          <AppText style={styles.emptyCopy}>New releases, reminders and account updates will appear here.</AppText>
        </View> : <ActivityIndicator color="#F54343" />}
      />
      {pending && <View style={styles.undoBar}>
        <AppText style={styles.undoCopy}>Notification deleted</AppText>
        <Pressable onPress={undoDelete}><AppText style={styles.undoText}>Undo</AppText></Pressable>
      </View>}
    </AppScreen>
  );
};

interface RowProps {item: INotification; onOpen: () => void; onToggleSeen: () => void; onDelete: () => void}

const NotificationRow = ({item, onOpen, onToggleSeen, onDelete}: RowProps) => (
  <ReanimatedSwipeable overshootRight={false} renderRightActions={() => <View style={styles.swipeActions}>
    <Pressable style={styles.readAction} onPress={onToggleSeen}><AppText style={styles.swipeLabel}>{item.hasSeen ? 'Unread' : 'Read'}</AppText></Pressable>
    <Pressable style={styles.deleteAction} onPress={onDelete}><AppText style={styles.swipeLabel}>Delete</AppText></Pressable>
  </View>}>
    <Pressable onPress={onOpen} style={[styles.row, !item.hasSeen && styles.unreadRow]}>
      {item.photoUri
        ? <AppImage source={{uri: item.photoUri}} style={styles.thumbnail} resizeMode="cover" />
        : <View style={styles.brandMark}><AppText style={styles.brandMarkText}>R</AppText></View>}
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <AppText numberOfLines={1} style={[styles.rowTitle, !item.hasSeen && styles.unreadTitle]}>{item.adminNotification.title}</AppText>
          {!item.hasSeen && <View style={styles.unreadDot} />}
        </View>
        <AppText numberOfLines={2} style={styles.rowCopy}>{item.adminNotification.description}</AppText>
        <AppText style={styles.time}>{getNotificationTime(item.createdAt)}</AppText>
      </View>
    </Pressable>
  </ReanimatedSwipeable>
);

export default NotificationScreen;

const styles = StyleSheet.create({
  screen: {paddingTop: 18},
  topActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 22, marginBottom: 4},
  actionText: {color: '#D6D6D6', fontSize: 12, fontFamily: 'MANROPE_600'}, dangerText: {color: '#FF6B6B'},
  list: {paddingBottom: 110}, emptyList: {flexGrow: 1, justifyContent: 'center'},
  sectionTitle: {color: '#8D8D8D', fontSize: 12, fontFamily: 'MANROPE_600', marginTop: 22, marginBottom: 10},
  row: {minHeight: 82, flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#121212', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#262626'},
  unreadRow: {backgroundColor: '#191515'}, thumbnail: {width: 48, height: 48, borderRadius: 24},
  brandMark: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2B1517'},
  brandMarkText: {color: '#F54343', fontFamily: 'LEXEND_700', fontSize: 19}, rowBody: {flex: 1, marginLeft: 12},
  rowTitleLine: {flexDirection: 'row', alignItems: 'center'}, rowTitle: {flex: 1, color: '#D5D5D5', fontFamily: 'MANROPE_600', fontSize: 13},
  unreadTitle: {color: '#FFFFFF', fontFamily: 'MANROPE_700'}, unreadDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#F54343', marginLeft: 8},
  rowCopy: {color: '#999999', fontFamily: 'MANROPE_400', fontSize: 12, lineHeight: 17, marginTop: 3},
  time: {color: '#6F6F6F', fontFamily: 'MANROPE_500', fontSize: 10, marginTop: 5},
  swipeActions: {width: 142, flexDirection: 'row'}, readAction: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#66520A'},
  deleteAction: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A9282E'},
  swipeLabel: {color: '#FFFFFF', fontFamily: 'MANROPE_700', fontSize: 11},
  empty: {alignItems: 'center', paddingHorizontal: 38}, emptyMark: {width: 54, height: 54, borderRadius: 27, backgroundColor: '#241719', alignItems: 'center', justifyContent: 'center', marginBottom: 18},
  emptyMarkText: {color: '#F54343', fontFamily: 'LEXEND_700', fontSize: 22}, emptyTitle: {color: '#FFFFFF', fontFamily: 'LEXEND_700', fontSize: 16},
  emptyCopy: {color: '#8D8D8D', fontFamily: 'MANROPE_400', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8}, loader: {marginVertical: 24},
  undoBar: {position: 'absolute', left: 20, right: 20, bottom: 24, minHeight: 52, borderRadius: 12, backgroundColor: '#282828', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16},
  undoCopy: {color: '#FFFFFF', fontFamily: 'MANROPE_500', fontSize: 13}, undoText: {color: '#FFCC00', fontFamily: 'MANROPE_700', fontSize: 13},
});
