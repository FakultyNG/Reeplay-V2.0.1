import React, {memo, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {getProfileDetails, setVideoQuality} from '@/api/profile.api';
import type {VideoQuality} from '@/api/profile.api';
import {selectUser, setCredentials} from '@/store/slices/userSlice';
import {requireRegisteredUser} from '@/Utils/guestAccess';

const options: {label: string; shortLabel: string; value: VideoQuality}[] = [
  {label: 'Automatic', shortLabel: 'Auto', value: 'automatic'},
  {label: '1080P', shortLabel: '1080P', value: '1080p'},
  {label: '720P', shortLabel: '720P', value: '720p'},
  {label: '480P', shortLabel: '480P', value: '480p'},
];

type Props = {
  onOpenChange?: (open: boolean) => void;
};

const PlayerQuality = memo(({onOpenChange}: Props) => {
  const dispatch = useAppDispatch();
  const profileQuality = useAppSelector(selectUser).settings_info?.video_quality;
  const savedQuality = options.some(option => option.value === profileQuality)
    ? (profileQuality as VideoQuality)
    : 'automatic';
  const [activeQuality, setActiveQuality] =
    useState<VideoQuality>(savedQuality);
  const [saving, setSaving] = useState<VideoQuality | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setActiveQuality(savedQuality), [savedQuality]);

  const setPickerOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const selectQuality = async (quality: VideoQuality) => {
    if (saving || quality === activeQuality) {
      setPickerOpen(false);
      return;
    }

    const previous = activeQuality;
    setActiveQuality(quality);
    setSaving(quality);
    try {
      const response = await setVideoQuality(quality);
      if (!response.ok) {
        throw new Error(response.data?.message || 'Unable to change quality');
      }

      const profile = await getProfileDetails();
      if (profile.ok && profile.data) {
        dispatch(setCredentials(profile.data.data));
      }
      setPickerOpen(false);
    } catch (error) {
      setActiveQuality(previous);
      Alert.alert(
        'Unable to change video quality',
        error instanceof Error
          ? error.message
          : 'Please check your connection and try again.',
      );
    } finally {
      setSaving(null);
    }
  };

  const activeLabel =
    options.find(option => option.value === activeQuality)?.shortLabel ?? 'Auto';

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Video quality, ${activeLabel}`}
        hitSlop={12}
        style={styles.trigger}
        onPress={() => {
          if (!requireRegisteredUser()) return;
          setPickerOpen(true);
        }}>
        <Text style={styles.triggerText}>{activeLabel}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.root}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerOpen(false)}
          />
          <View style={styles.card}>
            <Text style={styles.title}>Video quality</Text>
            {options.map(option => {
              const active = option.value === activeQuality;
              return (
                <TouchableOpacity
                  key={option.value}
                  disabled={saving !== null}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => selectQuality(option.value)}>
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>
                    {option.label}
                  </Text>
                  {saving === option.value ? (
                    <ActivityIndicator size="small" color="#FF1313" />
                  ) : (
                    active && <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
});

export default PlayerQuality;

const styles = StyleSheet.create({
  trigger: {
    minWidth: 58,
    minHeight: 36,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  triggerText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
  chevron: {color: '#FFFFFF', fontSize: 15, marginTop: -3},
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: '#171A1F',
    padding: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowActive: {backgroundColor: 'rgba(255,255,255,0.07)'},
  rowText: {color: '#C4C4C4', fontSize: 15},
  rowTextActive: {color: '#FFFFFF', fontWeight: '700'},
  activeDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF1313'},
});
