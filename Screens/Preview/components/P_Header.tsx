import {StyleSheet, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {WebView} from 'react-native-webview';
import {ResizeMode} from 'react-native-video';
import DynamicVideoComponent, {
  VideoPlayerRef,
} from '@/components/video/DynamicVideoComponent';
import {IVODContent} from '@/types/api/content.types';
import {
  getYouTubeEmbedUrl,
  resolvePlaybackSource,
} from '@/components/video/playbackConfig';
import {fetchVODSource} from '@/api/content.api';

export interface VideoOrientationProps {
  setFullscreen: () => void;
  isFullscreen: boolean;
  content: IVODContent;
}

const fillStyle = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});

const P_Header = ({
  setFullscreen,
  isFullscreen,
  content,
}: VideoOrientationProps) => {
  const playerRef = useRef<VideoPlayerRef>(null);
  const [videoURL, setVideoURL] = useState<string>('');

  useEffect(() => {
    let active = true;

    async function handleVideo() {
      if (!isFullscreen || content.type === 'series') {
        setVideoURL(content.trailer ?? '');
        return;
      }

      const response = await fetchVODSource(content._id, 'vod');
      if (active) {
        setVideoURL(response.ok && response.data ? response.data.data.source : '');
      }
    }

    handleVideo().catch(() => {
      if (active) {
        setVideoURL('');
      }
    });
    return () => {
      active = false;
    };
  }, [content._id, content.trailer, content.type, isFullscreen]);

  const coverUri = content.landscapePhoto || content.portraitPhoto;
  const youtubeEmbedUrl = getYouTubeEmbedUrl(videoURL);

  return (
    <View style={fillStyle.fill} className="overflow-hidden">
      {youtubeEmbedUrl ? (
        <WebView
          key={youtubeEmbedUrl}
          source={{uri: youtubeEmbedUrl}}
          style={fillStyle.fill}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
        />
      ) : (
        <DynamicVideoComponent
        ref={playerRef}
        endWithThumbnail
        endThumbnail={{uri: coverUri}}
        thumbnail={{uri: coverUri}}
        autoplay
        source={resolvePlaybackSource(videoURL, 'vod')}
        onError={e => console.log(e)}
        showDuration={true}
        isFullscreen={isFullscreen}
        onToggleFullScreen={setFullscreen}
        type={content.type}
        isTime={false}
        isSaveProgress={isFullscreen && content.type !== 'series' && Boolean(videoURL)}
        resizeMode={ResizeMode.COVER}
        style={fillStyle.fill}
        customStyles={{
          wrapper: fillStyle.fill,
          video: fillStyle.fill,
          videoWrapper: fillStyle.fill,
          thumbnail: fillStyle.fill,
          thumbnailImage: {width: '100%', height: '100%'},
        }}
        contentData={{
          _id: content._id,
          desc: content.description,
          logo: null,
          title: content.title,
          viewsCount: content.viewsCount,
          vidClass: content.vidClass,
        }}
        />
      )}
    </View>
  );
};

export default P_Header;
