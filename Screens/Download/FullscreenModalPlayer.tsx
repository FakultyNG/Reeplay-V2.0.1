import {View, StatusBar} from 'react-native';
import React, {useEffect, useRef} from 'react';
import DynamicVideoComponent, {
  VideoPlayerRef,
} from '@/components/video/DynamicVideoComponent';
import {IDownloadData} from '@/types/api/content.types';
import {resolvePlaybackSource} from '@/components/video/playbackConfig';

interface Props {
  isFullscreen: boolean;
  setFullscreen: () => void;
  content: IDownloadData;
  isDownloadScreen?: boolean;
  onChangeContent?: (next: IDownloadData) => void;
}

const DownloadFullscreenModalPlayer = ({
  content,
  isFullscreen,
  isDownloadScreen,
  setFullscreen,
  onChangeContent,
}: Props) => {
  const playerRef = useRef<VideoPlayerRef>(null);
  const playlist = content.playlist;
  const playlistIndex = content.playlistIndex ?? 0;
  const nextEpisode =
    playlist && playlistIndex + 1 < playlist.length
      ? playlist[playlistIndex + 1]
      : undefined;

  useEffect(() => {
    if (content.seekTo) {
      playerRef.current?.seek(content.seekTo);
    }
  }, [content._id]);

  const playNextEpisode = () => {
    if (!nextEpisode || !onChangeContent) {
      return;
    }
    onChangeContent({
      ...nextEpisode,
      playlist,
      playlistIndex: playlistIndex + 1,
    });
  };

  return (
    <View className="flex-1">
      <StatusBar hidden />

      <View className="w-full h-full overflow-hidden bg-black">
        <DynamicVideoComponent
          key={content._id}
          ref={playerRef}
          endWithThumbnail
          thumbnail={{
            uri: content.landscapePhoto,
          }}
          source={resolvePlaybackSource(content.video, 'vod')}
          autoplay
          onError={e => console.log(e)}
          showDuration={true}
          isFullscreen={isFullscreen}
          onToggleFullScreen={setFullscreen}
          type={content.type}
          isTime={false}
          isSaveProgress={!isDownloadScreen}
          seekTo={content.seekTo}
          handleNEXT={nextEpisode && onChangeContent ? playNextEpisode : undefined}
          contentData={{
            _id: content._id,
            desc: content.desc,
            logo: null,
            title: content.title,
            viewsCount: content.viewsCount,
            vidClass: content.vidClass,
            ...(content.watchedDocumentId && {
              watchedDocumentId: content.watchedDocumentId,
              seekTo: content.seekTo,
            }),
          }}
        />
      </View>
    </View>
  );
};

export default DownloadFullscreenModalPlayer;
