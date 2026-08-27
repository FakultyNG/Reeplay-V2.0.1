import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { PlayButton } from './controls/PlayButton';
import { VideoPlayerProps } from 'react-native-video-player';
import { AnimatedWrapper } from './controls/AnimatedWrapper';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import { DurationText, ProgressingDuration } from './controls/Durations';
import { MotiView } from 'moti';
import { Mute } from './controls/Mute';
import { Fullscreen } from './controls/Fullscreen';
import { Seekbar, SeekbarProps } from './controls/Seekbar';
import Animated, { Easing } from 'react-native-reanimated';
import Casting from './controls/Casting';
import CTAButton from './controls/ctaButton';
import { fullVideoType } from '@/navigation/AppNavigator';
import EpisodeNext from './controls/EpisodeNext';
import Subtitle from './controls/Subtitle';
import LinearGradient from 'react-native-linear-gradient';
import { BigClose, BrightnessIcon, PreviewCloseIcon, SeekBackIcon, SeekForwardIcon } from '@/assets/icons';
import { useNavigation } from '@react-navigation/native';
import BrightnessBar from '@/Screens/VideoScreen/components/BrightnessBar';
import AppImage from '../AppImage';
import { IContentData } from './DynamicVideoComponent';
import EyesIcon from '@/assets/icons/eyes.svg'
import { useSocket } from '../../Hooks/useSocket';
import { formatLikesNumber } from '@/Utils/formatAmount';

const AnimatedLinear = Animated.createAnimatedComponent(LinearGradient);

interface ControlsProps
  extends Omit<SeekbarProps, 'customStyles' | 'onSeeking'> { 
  customStyles: VideoPlayerProps['customStyles'];
  showDuration: VideoPlayerProps['showDuration'];
  disableFullscreen: VideoPlayerProps['disableFullscreen'];
  animationDuration: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  onPlayPress: () => void;
  onMutePress: () => void;
  onToggleFullScreen: () => void;
  handleVideoCastingFunc?: () => void;
  handleCTAFunc?: () => void;
  handleNEXT?: () => void;
  handleSUBTITLE?: () => void;
  type?: string;
  ctaType?:'vote'|'donate'
  isControlsVisible: boolean;
  isFullscreeen: boolean;
  isLoading: boolean
  contentData:IContentData
  isTime: boolean
  handleGoBackFunc?:() => void
  subtitleTracks?: {title: string; language: string}[]
  selectedSubtitleIndex?: number
  onSelectSubtitle?: (index: number) => void
  onSubtitlePickerOpenChange?: (open: boolean) => void
  onBrightnessGestureStart?: () => void
  onBrightnessGestureEnd?: () => void
}

export interface ProgressRef {
  onProgress: (progress: number) => void;
}

export const Controls = ({
  customStyles,
  onPlayPress,
  isPlaying,
  showDuration,
  onToggleFullScreen,
  duration,
  disableFullscreen,
  onMutePress,
  isMuted,
  animationDuration = 280,
  isControlsVisible,
  type,
  ctaType,
  handleCTAFunc,
  handleNEXT,
  handleSUBTITLE,
  handleVideoCastingFunc,
  isFullscreeen,
  onSeek,
  isLoading,
  contentData,
  handleGoBackFunc,
  progress,
  isTime,
  subtitleTracks = [],
  selectedSubtitleIndex = -1,
  onSelectSubtitle,
  onSubtitlePickerOpenChange,
  onBrightnessGestureStart,
  onBrightnessGestureEnd,
  ...seekbarProps
}: ControlsProps) => {
  const { _id, logo, title } = contentData;
  const { goBack } = useNavigation();
  const [seekingProgress, setSeekingProgress] =
    useState<number | null>(null);

const [pendingSeekProgress, setPendingSeekProgress] =
  useState<number | null>(null);

  const displayedProgress =
  seekingProgress ??
  pendingSeekProgress ??
  progress;

  const [brightLevel, setLevel] = useState<number | null>(null);
  const [viewsCount, setViewsCount] = useState<number>(
    contentData.viewsCount
  );

  // console.log(seekingProgress, progress, 'this is it...')

  const { socket } = useSocket();

  function handleSocket() {
    socket.on('joinedRoom', () => {
      setViewsCount(prev => prev + 1);
    });
  }

  useEffect(() => {
    handleSocket();
  }, []);

   const handleSeekForward = () => {
    onSeek(
      Math.min(
        displayedProgress * duration + 10,
        duration
      )
    );
  };

  const handleSeekBackward = () => {
    onSeek(
      Math.max(
        displayedProgress * duration - 10,
        0
      )
    );
  };

  useEffect(() => {
  if (
    pendingSeekProgress !== null &&
    Math.abs(progress - pendingSeekProgress) < 0.005
  ) {
    setPendingSeekProgress(null);
  }
}, [progress, pendingSeekProgress]);

  /* ---------------------------------- */
  /* MINIMAL CONTROLS (NO OVERLAY MODE)  */
  /* ---------------------------------- */

  // Hide chrome when auto-hide fires (preview + fullscreen). Live stays always-on.
  if (!isControlsVisible && !isLoading && type !== 'live') {
    return null;
  }

  /* ----------------------- */
  /* FULL CONTROLS OVERLAY   */
  /* ----------------------- */

  return (
    <AnimatedWrapper
      visible={isControlsVisible}
      animationDuration={animationDuration}
    >
      <>
        {/* TOP GRADIENT */}
        {isFullscreeen && (
          <AnimatedLinear
            colors={['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.35)', 'transparent']}
            style={{
              position: 'absolute',
              top: 0,
              height: 110,
              width: '100%',
              zIndex: -20,
            }}
          />
        )}

        {/* BOTTOM GRADIENT */}
        {!isFullscreeen ? (
          <AnimatedLinear
            colors={[
              'transparent',
              'rgba(0, 0, 0, 0.55)',
              'rgba(0, 0, 0, 0.92)',
            ]}
            style={{
              position: 'absolute',
              bottom: 0,
              height: 56,
              width: '100%',
              zIndex: -20,
            }}
          />
        ) : (
          <AnimatedLinear
            colors={['transparent', 'rgba(0, 0, 0, 0.55)', 'rgba(0, 0, 0, 0.95)']}
            style={{
              position: 'absolute',
              bottom: 0,
              height: 120,
              width: '100%',
              zIndex: -20,
            }}
          />
        )}
      </>

      <View
        style={[
          styles.chrome,
          isFullscreeen && styles.chromeFullscreen,
        ]}
      >
        {/* TOP PART */}
        <View className="m-2 mr-4 mt-3">
          {!isFullscreeen ? (
            <View className="flex-row items-center gap-x-5 ml-auto">
              <Casting handleCastingFunc={handleVideoCastingFunc} />
              <Pressable
                onPress={goBack}
                hitSlop={12}
                style={({pressed}) => ({opacity: pressed ? 0.65 : 1})}>
                <PreviewCloseIcon />
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center justify-between">
              <View className="ml-4 flex-row items-center flex-1 pr-4">
                {logo && (
                  <AppImage
                    source={
                      typeof logo === 'string' && logo !== ''
                        ? { uri: logo }
                        : require('@/assets/images/user.png')
                    }
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 99,
                      marginRight: 10,
                    }}
                  />
                )}
                <Text
                  numberOfLines={1}
                  className="font-ROBOTO_500 text-white text-[13px] flex-shrink">
                  {title}
                </Text>
              </View>

              <Pressable
                hitSlop={12}
                style={({pressed}) => ({opacity: pressed ? 0.65 : 1})}
                onPress={() => [
                  isPlaying && onPlayPress(),
                  handleGoBackFunc
                    ? handleGoBackFunc()
                    : onToggleFullScreen(),
                ]}
              >
                <BigClose />
              </Pressable>
            </View>
          )}
        </View>

        {/* Always show chrome — do not hide mute/play behind loading. */}
        <>
            {/* CENTER PART */}
            <View className="flex-1 items-center justify-center">
              {isFullscreeen && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    width: 56,
                    height: '78%',
                    zIndex: 999,
                    top: 40,
                    left: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View style={{alignSelf: 'center', marginBottom: 8}}>
                    <BrightnessIcon />
                  </View>

                  <View style={{height: 180, width: 56, alignItems: 'center'}}>
                    <BrightnessBar
                      brightLevel={brightLevel}
                      setLevel={setLevel}
                      onGestureStart={onBrightnessGestureStart}
                      onGestureEnd={onBrightnessGestureEnd}
                    />
                  </View>
                </Animated.View>
              )}

              <View
                className="flex-row gap-x-16 items-center justify-center"
                style={{opacity: isLoading ? 0.35 : 1}}>
                {isFullscreeen && type !== 'live' && !isTime && (
                  <Pressable
                    onPress={handleSeekBackward}
                    hitSlop={18}
                    style={({pressed}) => ({
                      opacity: pressed ? 0.6 : 1,
                      transform: [{scale: pressed ? 0.92 : 1}],
                    })}>
                    <SeekBackIcon />
                  </Pressable>
                )}

                <PlayButton
                  isPlaying={isPlaying}
                  onPlayPress={onPlayPress}
                  isFullscreen={isFullscreeen}
                />

                {isFullscreeen && type !== 'live' && !isTime && (
                  <Pressable
                    onPress={handleSeekForward}
                    hitSlop={18}
                    style={({pressed}) => ({
                      opacity: pressed ? 0.6 : 1,
                      transform: [{scale: pressed ? 0.92 : 1}],
                      marginLeft: -8,
                    })}>
                    <SeekForwardIcon />
                  </Pressable>
                )}
              </View>
            </View>

            {/* BOTTOM PART */}
            <View className={isFullscreeen ? 'mb-1' : undefined}>
              {!isFullscreeen && (
                <View className="ml-auto mr-3 mb-1">
                  <Mute
                    isMuted={isMuted}
                    onMutePress={onMutePress}
                  />
                </View>
              )}

              {/* SEEK BAR */}
              {!(type === 'live' && isTime) && (
                <View
                  style={{
                    marginBottom: !isFullscreeen ? -3 : 10,
                  }}
                  className="flex-row items-center gap-x-3"
                >
                  {isFullscreeen && showDuration && (
                    <DurationText
                      duration={duration}
                    />
                  )}

                  <Seekbar
                    fullWidth={!isControlsVisible}
                    {...seekbarProps}
                  progress={displayedProgress}
              onSeeking={setSeekingProgress}
            onSeek={(seconds) => {
  const nextProgress = duration > 0 ? seconds / duration : 0;

  setSeekingProgress(null);
  setPendingSeekProgress(nextProgress);
  onSeek(seconds);
}}
                    isPlaying={isPlaying}
                    duration={duration}
                    seekBarBackgroundCustomStyles={
                      customStyles?.seekBarBackground
                    }
                    seekBarCustomStyles={
                      isFullscreeen
                        ? {marginBottom: 0, marginLeft: 0, marginRight: 0}
                        : customStyles?.seekBar
                    }
                    seekBarFullWidthCustomStyles={
                      customStyles?.seekBarFullWidth
                    }
                    seekBarKnobCustomStyles={
                      customStyles?.seekBarKnob
                    }
                    seekBarKnobSeekingCustomStyles={
                      customStyles?.seekBarKnobSeeking
                    }
                    seekBarProgressCustomStyles={
                      customStyles?.seekBarProgress
                    }
                    isFullscreeen={isFullscreeen}
                  />

                  {isFullscreeen && showDuration && (
                    <ProgressingDuration
                      progress={progress}
                      duration={duration}
                    />
                  )}
                </View>
              )}

              {/* BOTTOM BUTTONS */}
              {isFullscreeen && (
                <View className="flex-row items-center justify-between pb-1">
                  <View className="flex-row items-center">
                    <View
                      style={{ width: 72 }}
                      className="flex-row items-center gap-x-2"
                    >
                      {type === 'live' && isTime && (
                        <>
                          <MotiView
                            from={{ opacity: 0.25 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              type: 'timing',
                              duration: 900,
                              easing: Easing.out(Easing.ease),
                              loop: true,
                            }}
                          >
                            <View className="w-[8px] h-[8px] rounded-full bg-red" />
                          </MotiView>
                          <Text className="font-ROBOTO_700 text-[11px] text-white tracking-wide">
                            LIVE
                          </Text>
                        </>
                      )}
                    </View>

                    <Mute
                      isMuted={isMuted}
                      onMutePress={onMutePress}
                    />

                    {type === 'live' && isTime && (
                      <View className="flex-row items-center gap-x-2 ml-5">
                        <EyesIcon />
                        <Text className="font-ROBOTO_400 text-white text-[13px]">
                          {formatLikesNumber(viewsCount)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center gap-x-5">
                    {type?.includes('series') && (
                      <EpisodeNext onPress={handleNEXT} />
                    )}
                    {type !== 'live' && (
                      <Subtitle
                        tracks={subtitleTracks}
                        selectedIndex={selectedSubtitleIndex}
                        onSelect={index => onSelectSubtitle?.(index)}
                        onOpenChange={onSubtitlePickerOpenChange}
                      />
                    )}
                    {ctaType && handleCTAFunc && (
                      <CTAButton
                        handleCTAFunc={handleCTAFunc}
                        ctaType={ctaType}
                      />
                    )}
                    <Casting
                      handleCastingFunc={handleVideoCastingFunc}
                    />

                    {!disableFullscreen && !isFullscreeen && (
                      <Fullscreen
                        onToggleFullScreen={onToggleFullScreen}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          </>
      </View>
    </AnimatedWrapper>
  );
};

const styles = StyleSheet.create({
  chrome: {
    ...StyleSheet.absoluteFillObject,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  chromeFullscreen: {
    // Keep controls edge-safe without shrinking the video surface.
    paddingHorizontal: 16,
  },
});

