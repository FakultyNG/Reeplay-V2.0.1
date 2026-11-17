import {View, Text, StyleProp, ViewStyle, StyleSheet} from 'react-native';
import React, {useRef} from 'react';
import Video, { ReactVideoProps, VideoRef} from 'react-native-video';
import {isHlsPlaybackUri} from './video/playbackConfig';

interface VideoProps extends ReactVideoProps {
  containerStyle?: ViewStyle;
  videoRef?:
    | ((instance: VideoRef | null) => void)
    | React.RefObject<VideoRef | null>
    | null;
}

const AppVideo = ({
  containerStyle,
  videoRef,
  ...otherProps
}: VideoProps) => {
  const source = otherProps.source;
  const normalizedSource =
    source &&
    typeof source === 'object' &&
    !Array.isArray(source) &&
    typeof source.uri === 'string' &&
    isHlsPlaybackUri(source.uri)
      ? {...source, type: 'm3u8' as const, shouldCache: false}
      : source;

  return (
    <View style={[styles.videoContainer, containerStyle]}>
      <Video ref={videoRef} {...otherProps} source={normalizedSource} />
    </View>
  );
};

export default AppVideo;

const styles = StyleSheet.create({
  videoContainer: {
    height: '100%',
    width: '100%',
  },
});
