import {ActivityIndicator, Alert, Pressable, StyleSheet, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {AppText} from '@/components';
import {QualityCheck} from '@/assets/icons';
import fonts from '@/configs/fonts';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {selectUser, setCredentials} from '@/store/slices/userSlice';
import {
  getProfileDetails,
  setVideoQuality,
} from '@/api/profile.api';
import type {VideoQuality} from '@/api/profile.api';

const options: {label: string; value: VideoQuality}[] = [
  {label: 'Automatic', value: 'automatic'},
  {label: '1080P', value: '1080p'},
  {label: '720P', value: '720p'},
  {label: '480P', value: '480p'},
];

const VideoQualityOption = () => {
  const dispatch = useAppDispatch();
  const {video_quality} = useAppSelector(selectUser).settings_info;
  const savedQuality = options.some(option => option.value === video_quality)
    ? (video_quality as VideoQuality)
    : 'automatic';
  const [activeQuality, setActiveQuality] = useState<VideoQuality>(savedQuality);
  const [savingQuality, setSavingQuality] = useState<VideoQuality | null>(null);

  useEffect(() => {
    setActiveQuality(savedQuality);
  }, [savedQuality]);

  async function handleSetVideoQuality(quality: VideoQuality) {
    if (savingQuality || quality === activeQuality) return;

    const previousQuality = activeQuality;
    setActiveQuality(quality);
    setSavingQuality(quality);
    try {
      const res = await setVideoQuality(quality);

      if (res.ok) {
        const user = await getProfileDetails();
        if (user.ok && user.data) dispatch(setCredentials(user.data.data));
        return;
      }

      setActiveQuality(previousQuality);
      Alert.alert(
        'Unable to change video quality',
        res.data?.message || 'Please check your connection and try again.',
      );
    } catch {
      setActiveQuality(previousQuality);
      Alert.alert(
        'Unable to change video quality',
        'Please check your connection and try again.',
      );
    } finally {
      setSavingQuality(null);
    }
  }

  return (
    <View>
      {options.map(item => {
        const show = activeQuality === item.value;
        return (
          <Pressable
            key={item.value}
            style={[styles.center]}
            disabled={savingQuality !== null}
            onPress={() => handleSetVideoQuality(item.value)}>
            <AppText
              style={show && {fontFamily: fonts.ROBOTO_700}}
              className="mr-1 font-ROBOTO_400 text-[13px] text-black">
              {item.label}
            </AppText>
            {savingQuality === item.value ? (
              <ActivityIndicator size="small" />
            ) : (
              show && <QualityCheck />
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

export default VideoQualityOption;

const styles = StyleSheet.create({
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});
