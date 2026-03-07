/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  EventType,
  AndroidImportance,
  AndroidStyle,
} from '@notifee/react-native';

const onMessageReceived = async message => {
  const data = message.data;
  
  const channelId = await notifee.createChannel({
    id: data.type || 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
   title: data.title || 'New Notification', 
    body: data.body || 'Touch to open',
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
};

messaging().setBackgroundMessageHandler(onMessageReceived);
messaging().onMessage(onMessageReceived);

notifee.onBackgroundEvent(async ({type, detail}) => {
  const {notification, pressAction} = detail;

  // Check if the user pressed the "Mark as read" action
  if (type === EventType.PRESS) {
    // Update external API
    // eventEmitter.emit('notificationReceived', notification);
    // Remove the notification
    await notifee.cancelNotification(notification.id);
  }
});

notifee.onForegroundEvent(async ({type, detail}) => {
  const {notification, pressAction} = detail;
  if (type === EventType.PRESS) {
    // eventEmitter.emit('notificationReceived', notification);
    await notifee.cancelNotification(notification.id);
  }
});

AppRegistry.registerComponent(appName, () => App);
