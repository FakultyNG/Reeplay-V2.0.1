import {
  useState,
  useCallback,
  forwardRef,
  useMemo,
  useRef,
  useImperativeHandle,
  useEffect,
} from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
  TouchableOpacity,
} from 'react-native';
import {
  ResizeMode,
  type OnProgressData,
  type OnLoadData,
  type VideoRef,
  type ReactVideoProps,
  type ReactVideoSource,
} from 'react-native-video';
import {RenderVideo, VideoInternalRef} from './VideoPlayer';
import {Thumbnail} from './controls/Thumbnail';
import {useBackButtonHandler} from '@/Hooks/nativeBackFunc';
import {useNavigation} from '@react-navigation/native';
import {deleteContinueWatchingById} from '@/api/content.api';
import {removeContinueWatchingById} from '@/store/slices/bannerSlice.slice';
import {useAppDispatch} from '@/Hooks/reduxHook';
import {BigClose} from '@/assets/icons';

export interface VideoPlayerRef extends VideoRef {
  stop: () => void;
}

export interface IContentData {
  _id: string;
  title: string;
  desc: string;
  logo: string | null;
  viewsCount: number;
  vidClass: string;
  seekTo?: number;
  watchedDocumentId?: string;
}

export interface CustomStyles {
  wrapper?: StyleProp<ViewStyle>;
  video?: StyleProp<ViewStyle>;
  videoWrapper?: StyleProp<ViewStyle>;
  controls?: StyleProp<ViewStyle>;
  playControl?: StyleProp<ViewStyle>;
  controlButton?: StyleProp<ViewStyle>;
  controlIcon?: StyleProp<ImageStyle>;
  playIcon?: StyleProp<ViewStyle>;
  seekBar?: ViewStyle;
  seekBarFullWidth?: StyleProp<ViewStyle>;
  seekBarProgress?: StyleProp<ViewStyle>;
  seekBarKnob?: StyleProp<ViewStyle>;
  seekBarKnobSeeking?: StyleProp<ViewStyle>;
  seekBarBackground?: StyleProp<ViewStyle>;
  thumbnail?: StyleProp<ViewStyle>;
  thumbnailImage?: StyleProp<ImageStyle>;
  playButton?: StyleProp<ViewStyle>;
  playArrow?: StyleProp<ImageStyle>;
  durationText?: StyleProp<TextStyle>;
}

export interface VideoPlayerProps extends ReactVideoProps {
  animationDuration?: number;
  autoplay?: boolean;
  controlsTimeout?: number;
  customStyles?: CustomStyles;
  defaultMuted?: boolean;
  disableControlsAutoHide?: boolean;
  disableFullscreen?: boolean;
  disableSeek?: boolean;
  duration?: number;
  endThumbnail?: ImageSourcePropType;
  endWithThumbnail?: boolean;
  fullScreenOnLongPress?: boolean;
  hideControlsOnStart?: boolean;
  loop?: boolean;
  muted?: boolean;
  onEnd?: () => void;
  onHideControls?: () => void;
  onLoad?: (event: OnLoadData) => void;
  onMutePress?: (isMuted: boolean) => void;
  onPlayPress?: () => void;
  onProgress?: (event: OnProgressData) => void;
  onShowControls?: () => void;
  onStart?: () => void;
  pauseOnPress?: boolean;
  paused?: boolean;
  resizeMode?: ResizeMode;
  showDuration?: boolean;
  source: ReactVideoSource;
  style?: StyleProp<ViewStyle>;
  thumbnail?: ImageSourcePropType;
  videoHeight?: number;
  videoWidth?: number;
  onToggleFullScreen: () => void;
  handleCTAFunc?: () => void;
  handleNEXT?: () => void;
  handleSUBTITLE?: () => void;
  type?: string;
  isTime: boolean;
  isFullscreen: boolean;
  ctaType?: 'vote' | 'donate';
  handleGoBackFunc?: () => void;
  contentData: IContentData;
  isSaveProgress?: boolean;
  seekTo?: number;
  castSourceUrl?: string;
}

/** Pre–quarter-flash-fix layout: onLayout width → 16:9 sizeStyles. */
const DynamicVideoComponent = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (props, ref) => {
    const {
      autoplay = false,
      customStyles = {},
      endThumbnail,
      endWithThumbnail,
      onStart,
      onEnd,
      style,
      thumbnail,
      videoHeight = 1080,
      videoWidth = 1920,
      onToggleFullScreen,
      ctaType,
      handleCTAFunc,
      handleNEXT,
      handleSUBTITLE,
      type,
      isFullscreen,
      isTime,
      handleGoBackFunc,
      isSaveProgress,
      seekTo,
      ...rest
    } = props;

    const videoRef = useRef<VideoInternalRef>(null);
    const {goBack} = useNavigation();
    const dispatch = useAppDispatch();

    const [isStarted, setIsStarted] = useState(autoplay);
    const [hasEnded, setHasEnded] = useState(false);
    const [width, setWidth] = useState(200);

    useImperativeHandle(ref, () => ({
      ...videoRef.current!,
      resume: () => {
        if (!isStarted) {
          setIsStarted(true);
        }
        videoRef.current?.resume();
      },
      stop: () => {
        setIsStarted(false);
        setHasEnded(true);
        videoRef.current?.dismissFullscreenPlayer();
      },
    }));

    const sizeStyles = useMemo(() => {
      const ratio = videoHeight / videoWidth;
      return {height: width * ratio, width};
    }, [videoWidth, videoHeight, width]);

    const _onStart = useCallback(() => {
      onStart?.();
      setIsStarted(true);
      setHasEnded(false);
      setTimeout(() => videoRef.current?.onStart(), 0);
    }, [onStart]);

    async function removeWatched(_id: string) {
      const res = await deleteContinueWatchingById(_id);
      if (res.ok) {
        dispatch(removeContinueWatchingById(_id));
      }
    }

    const _onEnd = useCallback(() => {
      onEnd?.();
      if (endWithThumbnail || endThumbnail) {
        setIsStarted(false);
        setHasEnded(true);
        videoRef.current?.dismissFullscreenPlayer();
        videoRef.current?.seek(0);
        videoRef.current?.pause();
        if (props.contentData.watchedDocumentId) {
          removeWatched(props.contentData.watchedDocumentId);
        }
      }
    }, [onEnd, endWithThumbnail, endThumbnail, props.contentData.watchedDocumentId]);

    const onLayout = useCallback((event: LayoutChangeEvent) => {
      const {width: containerWidth} = event.nativeEvent.layout;
      setWidth(containerWidth);
    }, []);

    useEffect(() => {
      if (seekTo) {
        videoRef.current?.seek(seekTo);
      }
    }, [seekTo, autoplay]);

    useBackButtonHandler(() =>
      isFullscreen
        ? [handleGoBackFunc ? handleGoBackFunc() : onToggleFullScreen()]
        : goBack(),
    );

    return (
      <View onLayout={onLayout} style={[customStyles.wrapper, {flex: 1}]}>
        <View className="w-full h-full relative">
          {((hasEnded && endThumbnail) || (!isStarted && thumbnail)) && (
            <View className="absolute w-full h-full" style={{zIndex: 999}}>
              <Thumbnail
                thumbnailSource={
                  hasEnded && endThumbnail ? endThumbnail : thumbnail!
                }
                style={style}
                sizeStyles={sizeStyles}
                onStart={_onStart}
                customStylesThumbnail={customStyles.thumbnail}
                customStylesThumbnailImage={customStyles.thumbnailImage}
                customStylesPlayButton={customStyles.playButton}
                customStylesPlayArrow={customStyles.playArrow}
                isFullscreen={isFullscreen}
              />
              {isFullscreen && (
                <TouchableOpacity
                  onPress={() =>
                    handleGoBackFunc
                      ? handleGoBackFunc()
                      : onToggleFullScreen()
                  }
                  className="absolute top-5 right-10">
                  <BigClose />
                </TouchableOpacity>
              )}
            </View>
          )}

          <RenderVideo
            ref={videoRef}
            {...rest}
            style={style}
            customStyles={customStyles}
            autoplay={autoplay}
            onEnd={_onEnd}
            sizeStyle={sizeStyles}
            onToggleFullScreen={onToggleFullScreen}
            ctaType={ctaType}
            handleCTAFunc={handleCTAFunc}
            handleNEXT={handleNEXT}
            handleSUBTITLE={handleSUBTITLE}
            isFullscreen={isFullscreen}
            thumbnail={thumbnail}
            isTime={isTime}
            handleGoBackFunc={handleGoBackFunc}
            type={type}
            isSaveProgress={isSaveProgress}
          />
        </View>
      </View>
    );
  },
);

export default DynamicVideoComponent;

const styles = StyleSheet.create({
  preloadingPlaceholder: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
