import {ActivityIndicator, Alert, Pressable, StyleSheet, useWindowDimensions, View} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  AppText,
  AppVideo,
  AppView,
  TouchableOpacity,
} from '@/components';
import {
  FullscreenIcon,
  MutedIcon,
  RemindMe,
  UnRemindMe,
  UpcomingPlay,
  VolumeIcon,
} from '@/assets/icons';
import { OnLoadData, VideoRef } from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import { upcomingEventDate } from '@/Utils/formatTime';
import {
  getReminderStatus,
  subscribeReminderStatus,
  unsubscribeReminderStatus,
} from '@/api/upcomingEvents.api';
import { IDownloadData, ILiveContent, IVODContent } from '@/types/api/content.types';
import { resolvePlaybackSource } from '@/components/video/playbackConfig';
import {requireRegisteredUser} from '@/Utils/guestAccess';
import {useGuestAccessStore} from '@/store/guestAccess.store';


interface Props {
  items: IVODContent | ILiveContent;
  index: number;
  playingIndexes: number[];
  setPlayingIndexes: React.Dispatch<React.SetStateAction<number[]>>;
  setFullscreenContent: React.Dispatch<React.SetStateAction<IDownloadData | null>>
  makeFullscreen:() => void
}

const UpcomingView = ({
  items,
  index,
  playingIndexes,
  setPlayingIndexes,
  setFullscreenContent,
  makeFullscreen,
}: Props) => {
  const {width} = useWindowDimensions();
  const isGuest = useGuestAccessStore(state => state.isGuest);
  const cardWidth = Math.min(width - 40, 680);
  const mediaHeight = Math.round(cardWidth * 9 / 16);
  const isPlaying = playingIndexes.includes(index);
  const videoRefs = useRef<Record<number, VideoRef | null>>({});
  const [muteVideo, setMuteVideo] = useState(true);
  const [remindMe, setRemindMe] = useState<boolean>(false);
  const [isReminderUpdating, setIsReminderUpdating] = useState(false);
  const reminderActionVersion = useRef(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBufferingLoad, setIsBufferingLoad] = useState(false);
  const [videoURL, setVideoURL] = useState<string>('');
  const primaryPosterUrl =
    'start' in items
      ? items.coverPhoto ?? ''
      : items.landscapePhoto || items.portraitPhoto || '';
  const fallbackPosterUrl =
    'start' in items ? '' : items.portraitPhoto || '';
  const [posterUrl, setPosterUrl] = useState(primaryPosterUrl);
  const contentType: 'live' | 'vod' = 'start' in items ? 'live' : 'vod';

  const onLoad = (_data: OnLoadData) => {
    setIsLoading(false);
  };

  const onLoadStart = () => setIsLoading(true);

  const onBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
    if (isBuffering) {
      setIsBufferingLoad(true);
    }
  };

  const onReadyForDisplay = () => {
    setIsBufferingLoad(false);
  };

  function handlePlayVideo(query: number) {
    if (playingIndexes.includes(query)) {
      // Pause the video
      setPlayingIndexes(prevIndexes => prevIndexes.filter(i => i !== query));
    } else {
      if (!videoURL) return;
      // Play the video
      setPlayingIndexes([query]);
    }
  }

  const handleSubscribe = async () => {
    if (isReminderUpdating) return;
    if (!requireRegisteredUser()) return;

    const previousValue = remindMe;
    const nextValue = !previousValue;
    reminderActionVersion.current += 1;
    setRemindMe(nextValue);
    setIsReminderUpdating(true);

    try {
      const res = previousValue
        ? await unsubscribeReminderStatus(items._id, contentType)
        : await subscribeReminderStatus(items._id, contentType);
      if (!res.ok) {
        Alert.alert(
          'Reminder not updated',
          'We couldn’t update this reminder. Please try again.',
        );
        setRemindMe(previousValue);
      }
    } catch (error) {
      console.log(error);
      setRemindMe(previousValue);
      Alert.alert(
        'Reminder not updated',
        'Check your connection and try again.',
      );
    } finally {
      setIsReminderUpdating(false);
    }
  };

  useEffect(() => {
    setVideoURL('start' in items ? items.previewVideo ?? '' : items.trailer);
  }, [items]);

  useEffect(() => {
    if (isGuest) {
      setRemindMe(false);
      return;
    }
    let cancelled = false;
    const requestVersion = reminderActionVersion.current;
    setRemindMe(false);
    getReminderStatus(items._id, contentType)
      .then(res => {
        if (
          !cancelled &&
          requestVersion === reminderActionVersion.current &&
          res.ok &&
          res.data
        ) {
          setRemindMe(res.data.data.user_subscribed);
        }
      })
      .catch(error => console.log(error));

    return () => {
      cancelled = true;
    };
  }, [contentType, isGuest, items._id]);

  useEffect(() => {
    setPosterUrl(primaryPosterUrl);
  }, [primaryPosterUrl]);


  return (
    <View style={styles.container}>
      <AppView style={[styles.media, {width: cardWidth, height: mediaHeight}]}>
        {!isPlaying ? (
          <>
            <FastImage
              source={{
                uri: posterUrl,
                priority: FastImage.priority.high,
                cache: FastImage.cacheControl.immutable,
              }}
              onError={() => {
                if (fallbackPosterUrl && posterUrl !== fallbackPosterUrl) {
                  setPosterUrl(fallbackPosterUrl);
                }
              }}
              style={styles.poster}
            />
            {/* <AppImage
              source={{uri: items.landscape_photo}}
              className="h-[186px] rounded-[20px]"
            /> */}
            <TouchableOpacity
              onPress={() => handlePlayVideo(index)}
              style={styles.playButton}
              disabled={!videoURL}
              accessibilityRole="button"
              accessibilityLabel={videoURL ? `Play preview for ${items.title}` : 'Preview unavailable'}>
              <UpcomingPlay />
            </TouchableOpacity>
            {!videoURL && (
              <View style={styles.unavailablePill}>
                <AppText style={styles.unavailableText}>Preview unavailable</AppText>
              </View>
            )}
          </>
        ) : (
          <>
            {(isBufferingLoad || isLoading) && (
              <AppView style={styles.loadingOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </AppView>
            )}
          </>
        )}

        {isPlaying && (
          <>
            <LinearGradient
              colors={['transparent', '#000000']}
              style={styles.playerGradient}
            />
            <AppView style={styles.playerActions}>
              <TouchableOpacity
                disabled={!videoURL}
                style={styles.volumeButton}
                onPress={() => setMuteVideo(!muteVideo)}>
                {muteVideo ? (
                  <AppView className="mt-[3px]">
                    <MutedIcon />
                  </AppView>
                ) : (
                  <VolumeIcon />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                [
                  setFullscreenContent({_id:items._id,desc:items.description,landscapePhoto:posterUrl,pg:items.pg,portraitPhoto:'start' in items ? items.coverPhoto ?? '' : items.portraitPhoto || posterUrl,title:items.title,video:'start' in items ? items.previewVideo ?? '' : items.trailer,size:'30',type:items.type,viewsCount:items.viewsCount,vidClass:items.vidClass})
                  ,makeFullscreen()
                ]
                }>
                <FullscreenIcon />
              </TouchableOpacity>
            </AppView>
          </>
        )}

        {isPlaying && (
          <AppVideo
            source={resolvePlaybackSource(videoURL, 'vod')}
            videoRef={(ref: VideoRef | null) => {
              videoRefs.current[index] = ref;
            }}
            style={styles.video}
            resizeMode="cover"
            muted={muteVideo}
            onEnd={() => setPlayingIndexes([])}
            paused={!isPlaying}
            onLoad={onLoad}
            onLoadStart={onLoadStart}
            onBuffer={onBuffer}
            onReadyForDisplay={onReadyForDisplay}
          />
        )}
      </AppView>

      <AppView style={[styles.details, {width: cardWidth}]}>
        <AppView style={styles.titleLine}>
          <AppText style={styles.typePill}>
            {items.type}
          </AppText>
          <AppText numberOfLines={2} style={styles.contentTitle}>
            {items.title}
          </AppText>
        </AppView>
        <AppView style={styles.reminderRow}>
          <AppText style={styles.releaseDate}>
            coming {upcomingEventDate('start' in items ? items.start : items.releaseDate)}
          </AppText>
          <Pressable
            onPress={handleSubscribe}
            disabled={isReminderUpdating}
            accessibilityRole="switch"
            accessibilityLabel={remindMe ? 'Remove reminder' : 'Add reminder'}
            accessibilityState={{checked: remindMe, disabled: isReminderUpdating}}
            style={({pressed}) => [
              styles.reminderButton,
              remindMe && styles.reminderButtonSelected,
              pressed && styles.pressed,
            ]}>
            {remindMe ? <RemindMe /> : <UnRemindMe />}
            <AppText style={[styles.reminderText, remindMe && styles.reminderTextSelected]}>
              {isReminderUpdating ? 'Saving…' : remindMe ? 'Reminder set' : 'Remind me'}
            </AppText>
          </Pressable>
        </AppView>

        <AppText numberOfLines={3} style={styles.description}>
          {items.description}
        </AppText>
      </AppView>
    </View>
  );
};

export default UpcomingView;

const styles = StyleSheet.create({
  container: {alignItems: 'center', marginBottom: 18},
  media: {position: 'relative', overflow: 'hidden', borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17191E'},
  poster: {width: '100%', height: '100%'},
  video: {width: '100%', height: '100%'},
  playButton: {
    position: 'absolute',
    shadowColor: '#818181',
    shadowOffset: {width: 1, height: 2},
    shadowOpacity: 0.74,
    shadowRadius: 6.27,
    elevation: 10,
  },
  unavailablePill: {position: 'absolute', bottom: 13, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.72)'},
  unavailableText: {color: '#C6C8CD', fontFamily: 'MANROPE_600', fontSize: 10},
  loadingOverlay: {...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)'},
  playerGradient: {position: 'absolute', bottom: 0, height: 70, width: '100%', zIndex: 20},
  playerActions: {position: 'absolute', left: 14, right: 14, bottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 30},
  volumeButton: {height: 17, marginBottom: 3},
  details: {paddingTop: 13, paddingHorizontal: 2},
  titleLine: {flexDirection: 'row', alignItems: 'flex-start', gap: 9},
  typePill: {marginTop: 3, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, overflow: 'hidden', color: '#FFFFFF', backgroundColor: '#E6363C', fontFamily: 'MANROPE_700', fontSize: 8, textTransform: 'uppercase'},
  contentTitle: {flex: 1, color: '#FFFFFF', fontFamily: 'LEXEND_700', fontSize: 20, lineHeight: 25},
  reminderRow: {marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  releaseDate: {flex: 1, color: '#8E929C', fontFamily: 'MANROPE_700', fontSize: 10, textTransform: 'uppercase'},
  reminderButton: {minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 18, borderWidth: 1, borderColor: '#383B43', backgroundColor: '#181A1F'},
  reminderButtonSelected: {borderColor: '#B22429', backgroundColor: '#321719'},
  reminderText: {color: '#D5D7DB', fontFamily: 'MANROPE_600', fontSize: 10},
  reminderTextSelected: {color: '#FFFFFF'},
  description: {maxWidth: 560, color: '#A5A8AF', fontFamily: 'MANROPE_400', fontSize: 12, lineHeight: 18, marginTop: 10},
  pressed: {opacity: 0.72},
});
