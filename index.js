/**
 * @format
 */

import { AppRegistry, AppState } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  EventType,
  AndroidImportance,
  AndroidStyle,
} from '@notifee/react-native';
import {notifyNotificationReceived, queueNotificationOpen} from './Utils/notificationNavigation';

const onMessageReceived = async message => {
  const data = message.data || {};
  // Android/iOS already renders notification payloads while backgrounded.
  // Only create our own notification for foreground or data-only messages.
  if (AppState.currentState !== 'active' && message.notification) return;
  
  const channelId = await notifee.createChannel({
    id: data.type || 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title: data.title || message.notification?.title || 'New Notification',
    body: data.body || message.notification?.body || 'Touch to open',
    data: {...data, _messageId: message.messageId || ''},
    android: {
      channelId,
      smallIcon: 'ic_notification',
    color: '#FF1313',
      largeIcon: 'ic_launcher', 
      pressAction: {
        id: 'default',
      },
      style: { 
        type: AndroidStyle.BIGTEXT, 
        text: data.body || 'New message received',
      },
      importance: AndroidImportance.HIGH,
    },
    ios: {
      attachments: data.image ? [
        {
          url: data.image,
        },
      ] : [],
      foregroundPresentationOptions: {
        badge: true,
        sound: true,
        banner: true,
        list: true,
      },
    },
  });
  if (AppState.currentState === 'active') {
    await notifee.incrementBadgeCount();
    notifyNotificationReceived({...data, _messageId: message.messageId || ''});
  }
};

messaging().setBackgroundMessageHandler(onMessageReceived);
messaging().onMessage(onMessageReceived);

notifee.onBackgroundEvent(async ({type, detail}) => {
  const {notification} = detail;

  // Check if the user pressed the "Mark as read" action
  if (type === EventType.PRESS) {
    queueNotificationOpen(notification?.data);
    if (notification?.id) await notifee.cancelNotification(notification.id);
  }
});

notifee.onForegroundEvent(async ({type, detail}) => {
  const {notification} = detail;
  if (type === EventType.PRESS) {
    queueNotificationOpen(notification?.data);
    if (notification?.id) await notifee.cancelNotification(notification.id);
  }
});

AppRegistry.registerComponent(appName, () => App);
