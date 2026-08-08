import {StyleSheet, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import DynamicVideoComponent, {
  VideoPlayerRef,
} from '@/components/video/DynamicVideoComponent';
import {IVODContent} from '@/types/api/content.types';
import {resolvePlaybackSource} from '@/components/video/playbackConfig';

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

  async function handleVideo() {
    setVideoURL(
      isFullscreen && content.type !== 'series'
        ? content.video
        : content.trailer,
    );
  }

  useEffect(() => {
    handleVideo();
  }, []);

  const coverUri = content.landscapePhoto || content.portraitPhoto;

  return (
    <View style={fillStyle.fill} className="overflow-hidden">
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
        isSaveProgress={videoURL === content.video}
        resizeMode="cover"
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
    </View>
  );
};

export default P_Header;
