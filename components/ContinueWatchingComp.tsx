import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet} from 'react-native';
import {
  AppButton,
  AppImage,
  AppText,
  AppView,
  TouchableOpacity,
} from '@/components';
import Size from '@/Utils/useResponsiveSize';
import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import {CloseIcon, InfoBtn} from '@/assets/icons';
import {previewContentType, RootNav} from '@/navigation/AppNavigator';
import routes from '@/navigation/routes';
import {useNavigation} from '@react-navigation/native';
import {ImageStyle} from 'react-native-fast-image';
import {IContinueWatching, IDownloadData} from '@/types/api/content.types';
import {deleteContinueWatchingById} from '@/api/content.api';
import {useAppDispatch} from '@/Hooks/reduxHook';
import {removeContinueWatchingById} from '@/store/slices/bannerSlice.slice';
import ToastNotification from './ToastNotifications';
import {setPreviewContent} from '@/store/slices/previewContentSlice';
import {getRemoteFileSize} from '@/api/external.api';
import {getEpisodePlaybackUrl} from '@/Utils/seriesContent';

const ITEM_WIDTH: number = Size.calcWidth(232);

interface ContinueProps {
  item: IContinueWatching;
  imageStyle?: ImageStyle;
  makeFullscreen: () => void;
  setFullscreenContent: React.Dispatch<
    React.SetStateAction<IDownloadData | null>
  >;
}

const ContinueWatchingComp = ({
  item,
  imageStyle,
  makeFullscreen,
  setFullscreenContent,
}: ContinueProps) => {
  const {navigate} = useNavigation<RootNav>();
  const [loading, setLoading] = useState<boolean>(false);
  const [size, setSize] = useState<string>('');
  const dispatch = useAppDispatch();

  const video = item?.video;
  const episode = item?.episode;
  const progressRatio =
    item?.totalDuration > 0 ? item.duration / item.totalDuration : 0;
  const progressBarWidth = ITEM_WIDTH * progressRatio;
  const episodeUrl = episode
    ? getEpisodePlaybackUrl(episode)
    : getEpisodePlaybackUrl(video);
  const videoType = (video?.type ?? '').toLowerCase();

  const itemData: IDownloadData | null = video
    ? {
        _id: episode ? episode._id : video._id,
        desc: episode ? episode.description : video.description,
        landscapePhoto: video.landscapePhoto,
        portraitPhoto: video.portraitPhoto,
        pg: video.pg,
        size,
        title: episode ? episode.title : video.title,
        type: video.type,
        vidClass: video.vidClass,
        video: episodeUrl ?? '',
        viewsCount: Number(episode ? episode.viewsCount : video.viewsCount),
        seekTo: item.duration,
        watchedDocumentId: item.watchedDocumentId,
        playbackRole:
          (episode ? episode.video : video.video) ? 'main' : 'trailer',
      }
    : null;

  async function removeContinueWatching() {
    try {
      setLoading(true);
      const res = await deleteContinueWatchingById(item.watchedDocumentId);
      if (res.ok) {
        dispatch(removeContinueWatchingById(item.watchedDocumentId));
      } else {
        ToastNotification('error', `${res.data?.message}`);
      }
    } catch (error) {
      ToastNotification('error', `${error}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function handleItem() {
      if (!episodeUrl) {
        return;
      }
      const fileSize = await getRemoteFileSize(episodeUrl);
      const sizeInMB = fileSize
        ? (fileSize / (1024 * 1024)).toFixed(2)
        : null;
      if (sizeInMB) {
        setSize(sizeInMB);
      }
    }
    handleItem();
  }, [item?.watchedDocumentId, episodeUrl]);

  if (!item || !video || !itemData) {
    return null;
  }

  return (
    <AppView style={{width: ITEM_WIDTH}} className="mt-4 mr-3">
      <AppView className="relative overflow-hidden">
        <TouchableOpacity
          onPress={removeContinueWatching}
          hitSlop={20}
          className="absolute z-10 top-1 right-1">
          {loading ? <ActivityIndicator size={'small'} /> : <CloseIcon />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (!episodeUrl) {
              ToastNotification('error', 'This video is not ready to play yet.');
              return;
            }
            setFullscreenContent({
              ...itemData,
              watchedDocumentId: item.watchedDocumentId,
            });
            makeFullscreen();
          }}
          className="w-full h-[102px] overflow-hidden">
          <AppImage
            source={{uri: video.landscapePhoto || video.portraitPhoto}}
            style={[imageStyle, {height: 102, width: '100%'}]}
          />
        </TouchableOpacity>
        <AppView className="absolute bottom-0 w-full">
          <AppView
            style={{
              transform: [{translateX: -ITEM_WIDTH + progressBarWidth}],
              width: ITEM_WIDTH,
            }}
            className="h-[2px] bg-red"
          />
        </AppView>
      </AppView>
      <AppView className="flex-row justify-between mt-3">
        <AppView>
          {videoType.includes('music') && (
            <AppText
              style={[
                styles.title,
                {
                  fontSize: Size.calcHeight(10),
                  fontFamily: fonts.MANROPE_400,
                },
              ]}>
              {video.subtitle}
            </AppText>
          )}

          <AppText style={styles.title}>
            {episode ? episode.title : video.title}
          </AppText>

          <AppText style={[styles.title, {fontSize: Size.calcHeight(10.5)}]}>
            {video.type}
          </AppText>
        </AppView>

        <AppView className="flex-row">
          <AppButton
            bgColor={colors.RED}
            onPress={() => {
              dispatch(setPreviewContent(video));
              navigate(routes.PREVIEW_SCREEN, {
                content: videoType.includes('series')
                  ? previewContentType['tv series']
                  : videoType.includes('video')
                    ? previewContentType['music video']
                    : previewContentType.film,
                videoURL: video.trailer ?? episodeUrl ?? '',
              });
            }}
            replaceDefaultContent={<InfoBtn />}
            style={{
              width: Size.calcWidth(45),
              height: Size.calcWidth(20),
              borderRadius: 2,
              paddingVertical: 0,
              paddingHorizontal: 2,
            }}
          />
        </AppView>
      </AppView>
    </AppView>
  );
};

export default ContinueWatchingComp;

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.MANROPE_700,
    fontSize: Size.calcHeight(13.5),
    color: colors.WHITE,
    maxWidth: 130,
  },
});
