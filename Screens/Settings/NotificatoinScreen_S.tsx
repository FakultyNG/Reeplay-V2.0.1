import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet} from 'react-native';
import {AppHeader, AppScreen, AppText, AppView} from '@/components';
import ToggleButton from '@/components/ToggleButton';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {selectUser, setCredentials} from '@/store/slices/userSlice';
import {
  getProfileDetails,
  NotificationPreferences,
  setNotificationPreferences,
} from '@/api/profile.api';
import {
  registerCurrentNotificationDevice,
  unregisterNotificationDevice,
} from '@/Utils/notificationDevice';

type PreferenceKey = keyof NotificationPreferences;

const preferenceRows: Array<{
  key: Exclude<PreferenceKey, 'allow_notifications'>;
  title: string;
  description: string;
}> = [
  {key: 'new_services', title: 'New services', description: 'Reeplay feature, product, plan and payment updates.'},
  {key: 'upcoming_events', title: 'Upcoming content', description: 'Scheduled films, series, live events and useful reminders.'},
  {key: 'new_arrivals', title: 'New arrivals', description: 'Films, series and other content newly available in the library.'},
  {key: 'live_channels', title: 'Live channels', description: 'Channel launches and live-now announcements.'},
];

const NotificatoinScreen_S = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectUser).settings_info;
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    allow_notifications: settings.allow_notifications,
    new_services: settings.new_services,
    upcoming_events: settings.upcoming_events,
    new_arrivals: settings.new_arrivals,
    live_channels: settings.live_channels,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPreferences({
      allow_notifications: settings.allow_notifications,
      new_services: settings.new_services,
      upcoming_events: settings.upcoming_events,
      new_arrivals: settings.new_arrivals,
      live_channels: settings.live_channels,
    });
  }, [settings]);

  const updatePreference = async (key: PreferenceKey, value: boolean) => {
    if (saving) return;
    const previous = preferences;
    const next = {...preferences, [key]: value};
    setPreferences(next);
    setSaving(true);

    try {
      if (key === 'allow_notifications' && value) {
        const registered = await registerCurrentNotificationDevice();
        if (!registered) throw new Error('Please allow notifications in your device settings.');
      }
      const response = await setNotificationPreferences(next);
      if (!response.ok) throw new Error(response.data?.message || 'Unable to save notification settings.');
      if (key === 'allow_notifications' && !value) await unregisterNotificationDevice();

      const profile = await getProfileDetails();
      if (profile.ok && profile.data) dispatch(setCredentials(profile.data.data));
    } catch (error) {
      setPreferences(previous);
      Alert.alert('Notifications not updated', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen containerStyle={styles.screen}>
      <AppView className="px-5">
        <AppHeader />
        <AppText className="font-LEXEND_600 text-white text-xl mt-7">Notifications</AppText>
        <AppText className="font-MANROPE_400 text-sm text-grey_200 mt-2 mb-5">
          Choose which updates you want Reeplay to send. Your choices are saved to your account.
        </AppText>
      </AppView>
      <AppView style={styles.card}>
        <PreferenceRow
          title="Allow notifications"
          description="Master switch for push notifications on this device."
          value={preferences.allow_notifications}
          disabled={saving}
          onToggle={value => updatePreference('allow_notifications', value)}
        />
        {preferenceRows.map(row => (
          <PreferenceRow
            key={row.key}
            title={row.title}
            description={row.description}
            value={preferences[row.key]}
            disabled={saving}
            onToggle={value => updatePreference(row.key, value)}
          />
        ))}
      </AppView>
    </AppScreen>
  );
};

const PreferenceRow = ({title, description, value, disabled, onToggle}: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onToggle: (value: boolean) => void;
}) => (
  <AppView style={styles.row}>
    <AppView style={styles.copy}>
      <AppText className="font-MANROPE_600 text-sm text-white">{title}</AppText>
      <AppText className="font-MANROPE_400 text-xs text-grey_200 mt-1 leading-5">{description}</AppText>
    </AppView>
    <ToggleButton isOn={value} onToggle={onToggle} disabled={disabled} />
  </AppView>
);

export default NotificatoinScreen_S;

const styles = StyleSheet.create({
  screen: {paddingTop: 20, paddingHorizontal: 0},
  card: {marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', backgroundColor: '#171717'},
  row: {minHeight: 82, paddingHorizontal: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#343434'},
  copy: {flex: 1, paddingRight: 20},
});
