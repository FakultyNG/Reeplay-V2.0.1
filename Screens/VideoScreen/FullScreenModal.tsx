import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppImage, AppScreen, AppText, AppVideo, AppView } from '@/components';
import {
  OnLoadData,
  OnProgressData,
  OnSeekData,
  type VideoRef,
} from 'react-native-video';
import useToggle from '@/Hooks/useToggle';
import Orientation from 'react-native-orientation-locker';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  B_PauseBtn,
  B_PlayBtn,
  BigClose,
  BrightnessIcon,
  Donate_VoteIcon,
  EpisodesMenu,
  MutedIcon,
  NextIcon,
  SeekBackIcon,
  SeekForwardIcon,
  SubtitleIcon,
  VolumeIcon,
} from '@/assets/icons';
import LinearGradient from 'react-native-linear-gradient';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { FullScreenVideo, FullScreenVideoRoute } from '@/types/typings';
import colors from '@/configs/colors';
import SeekBar from './components/SeekBar';
import { formatDuration } from '@/Utils/formatVideoDuration';
import Size from '@/Utils/useResponsiveSize';
import BrightnessBar from './components/BrightnessBar';
import { fullVideoType } from '@/navigation/AppNavigator';
import LottieView from 'lottie-react-native';
import routes from '@/navigation/routes';
import BlurView from 'react-native-blur-effect';
import { BlurView as Blur } from '@react-native-community/blur';
import {useAppDispatch} from '@/Hooks/reduxHook';
import {
  resetFullVideo,
} from '@/store/slices/fullScreenVideo.slice';
import FastImage from 'react-native-fast-image';
import { resolvePlaybackSource } from '@/components/video/playbackConfig';
import Casting from '@/components/video/controls/Casting';
import {
  MediaInfo,
  useCastSession,
  useRemoteMediaClient,
} from 'react-native-google-cast';
import DynamicVideoComponent from '@/components/video/DynamicVideoComponent';


const AnimatedLinear = Animated.createAnimatedComponent(LinearGradient);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FullScreenModal = () => {
  const dispatch = useAppDispatch();
  const route = useRoute<FullScreenVideoRoute>();
  const {
    type,
    videoURL,
    channelImage: channelImg,
    donate,
    vote,
    _id,
    title,
    upcoming,
    coverImg,
    isTime,
  } = route.params;
  const useApprovedPlayer =
    !upcoming && (type !== fullVideoType.live || Boolean(isTime));
  const navigation = useNavigation<FullScreenVideo>();
  const videoRef = useRef<VideoRef>(null);
  const videoRef2 = useRef<VideoRef>(null);
  const currentTimeRef = useRef(0);
  const lastCastUrlRef = useRef('');
  const castSession = useCastSession();
  const remoteMediaClient = useRemoteMediaClient();
  const [muteVideo, setMuteVideo] = useToggle(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isBufferingLoad, setIsBufferingLoad] = useState(false);
  const [hide, setHide] = useState(false);
  const isFocused = useIsFocused();
  const [fixed, setFixed] = useState({
    time: currentTime,
    set: false,
  });
  const myViewRef = useRef<View>(null);
  const [seekWidth, setSeekWidth] = useState(Size.getWidth() - 340);
  const [orientation, setOrientation] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [cover, setCover] = useState<boolean>(true);
  const [key, setKey] = useState(0);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (useApprovedPlayer) return;
    if (!castSession || !remoteMediaClient || !videoURL) {
      if (!castSession) {
        lastCastUrlRef.current = '';
      }
      return;
    }

    if (lastCastUrlRef.current === videoURL) {
      return;
    }

    const mediaInfo: MediaInfo = {
      contentUrl: videoURL,
      contentType: videoURL.toLowerCase().includes('.m3u8')
        ? 'application/x-mpegURL'
        : 'video/mp4',
      metadata: {
        type: 'generic',
        title: title || 'Reeplay',
        images: coverImg ? [{url: coverImg}] : [],
      },
    };

    lastCastUrlRef.current = videoURL;
    setIsPlaying(true);
    void remoteMediaClient
      .loadMedia({
        mediaInfo,
        autoplay: true,
        startTime: currentTimeRef.current,
      })
      .catch(error => {
        lastCastUrlRef.current = '';
        console.error('Failed to load media on Cast device:', error);
      });
  }, [castSession, remoteMediaClient, videoURL, title, coverImg, useApprovedPlayer]);

  useFocusEffect(
    React.useCallback(() => {
      // Reset key when the screen is focused, causing re-render
      setKey(prevKey => prevKey + 1);
    }, []),
  );

  const measureView = () => {
    if (myViewRef.current) {
      myViewRef.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number,
        ) => {
          console.log('Element position from the top:', width);
          setSeekWidth(width);
        },
      );
    }
  };

  const transD = useRef(new Animated.Value(0));
  const transU = useRef(new Animated.Value(0));
  const opacityU = useRef(new Animated.Value(1));

  function handle_VOTE_DONATE() {
    if (donate) {
      // Orientation.lockToPortrait();
      navigation.navigate(routes.MAIN, {
        screen: routes.SUBSCRIPTION_SCREEN,
        params: {
          tab: 'donate',
          currency: 'NGN',
          metadata: {liveId: _id},
        },
      });
    }

    if (vote && route.params.voteInfo) {
      // Orientation.lockToPortrait();
      setIsPlaying(true);

      navigation.navigate(routes.MAIN, {
        screen: routes.VOTE_SCREEN,
        params: {
          _id,
          voteInfo: route.params.voteInfo,
        },
      });
    }
  }

  const animatedTransform = (
    toValue: number,
    trans: React.MutableRefObject<Animated.Value>,
  ) => {
    Animated.timing(trans.current, {
      toValue,
      duration: 450,
      useNativeDriver: true,
      easing: Easing.ease,
    }).start();
  };

  const onLoad = (data: OnLoadData) => {
    setDuration(Math.round(data.duration));
    setIsLoading(false);
    setCover(false);
  };

  const onLoadStart = () => setIsLoading(true);

  const onProgress = (data: OnProgressData) => {
    if (!isLoading) {
      if (fixed.set) {
        setCurrentTime(fixed.time);
      }
      if (data.currentTime === fixed.time && fixed.set) {
        setCurrentTime(data.currentTime);
        setFixed({
          time: data.currentTime,
          set: false,
        });
      }
      if (!fixed.set) {
        setCurrentTime(data.currentTime);
        setIsBufferingLoad(false);
      }
    }
  };

  const onEnd = () => {
    setCurrentTime(0);
    videoRef.current?.seek(0);
    videoRef2.current?.seek(0);
    setIsPlaying(true);
    setCover(true);
  };

  const onSeek = (data: OnSeekData) => {
    setIsPlaying(false);
    setIsBufferingLoad(false);
  };

  const handleSeek = (time: number) => {
    setIsPlaying(true);
    setIsBufferingLoad(true);
    videoRef.current?.seek(time);
  };

  const onBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
    setIsBuffering(isBuffering);
    if (isBuffering) {
      setIsBufferingLoad(true);
    }
  };

  const onReadyForDisplay = () => {
    setIsBufferingLoad(false);
    measureView();
  };

  function existFullscreen() {
    Orientation.lockToPortrait();

    dispatch(resetFullVideo());

    navigation.setOptions({
      orientation: 'portrait',
    });
    navigation.goBack();
  }

  function checkOrientation() {
    // if (!isFocused) return;
    Orientation.getOrientation(orient => {
      if (orient === 'PORTRAIT') {
        Orientation.lockToLandscapeLeft();
        checkOrientation();
      } else {
        setOrientation(orient);
      }
      // dispatch(set(orientation))
    });
  }

  useEffect(() => {
    if (isFocused) Orientation.lockToLandscapeLeft();
    checkOrientation();

  }, [isFocused]);

  useEffect(() => {
    if (useApprovedPlayer) return;
    let loadingTimeout: any;

    const startLoadingTimeout = () => {
      // Set a timeout for 5 seconds (you can adjust the duration)
      loadingTimeout = setTimeout(() => {
        existFullscreen();
        Alert.alert(
          'Video unavailable',
          'The video took too long to load. Check your connection and try again.',
          [{text: 'OK'}],
        );
        setIsLoading(false);
      }, 20000);
    };

    const clearLoadingTimeout = () => {
      // Clear the timeout if content is successfully loaded
      clearTimeout(loadingTimeout);
    };

    if (isLoading) {
      startLoadingTimeout();
    } else {
      clearLoadingTimeout();
    }

    return () => {
      clearLoadingTimeout();
    };
  }, [isLoading, useApprovedPlayer]);

  useEffect(() => {
    videoRef2.current?.seek(currentTime);
  }, [currentTime]);

  useEffect(() => {
    let timeoutId: any;
    let intervalId: any;
    let timerX: number = 0;

    const decreaseTimer = () => {
      // Ensure timer doesn't go below 0
      timerX -= 1;
    };

    const clearTimer = () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };

    if (hide) {
      animatedTransform(0, opacityU);
      animatedTransform(70, transD);
      animatedTransform(-70, transU);
      timerX = 0;
      clearTimer(); // Clear existing timeout and interval
    }

    if (!hide) {
      animatedTransform(1, opacityU);
      animatedTransform(0, transD);
      animatedTransform(0, transU);
      timerX = 7;

      if (isPlaying) {
        clearTimer(); // Clear existing timeout and interval
        return;
      }

      intervalId = setInterval(decreaseTimer, 1000);

      // Set timeout to hide after 10 seconds
      timeoutId = setTimeout(() => {
        setHide(true);
        clearTimer(); // Clear the interval when timer reaches 0
      }, timerX * 1000);
    }

    if (isPlaying) setHide(false);

    if (isBufferingLoad) setHide(false);

    if (muteVideo || !muteVideo) timerX = 7;

    // Clear the timeout and interval when the hide variable changes
    return () => {
      clearTimer();
    };
  }, [isPlaying, hide, muteVideo, isBufferingLoad]);

  useEffect(() => {
    measureView();
    setTimeout(() => {
      setShow(true);
    }, 1500);
  }, []);

  if (useApprovedPlayer) {
    return (
      <View style={styles.approvedPlayer}>
        <StatusBar hidden />
        <DynamicVideoComponent
          autoplay
          source={resolvePlaybackSource(
            videoURL,
            type === fullVideoType.live && isTime ? 'live' : 'vod',
          )}
          thumbnail={coverImg ? {uri: coverImg} : undefined}
          showDuration
          isFullscreen
          minimalUi
          enableMainContentAds={
            type === fullVideoType.live && Boolean(isTime) && !upcoming
          }
          isTime={Boolean(isTime)}
          type={
            type === fullVideoType.live
              ? 'live'
              : type === fullVideoType.series
                ? 'series'
                : 'vod'
          }
          onToggleFullScreen={existFullscreen}
          handleGoBackFunc={existFullscreen}
          ctaType={vote ? 'vote' : donate ? 'donate' : undefined}
          handleCTAFunc={vote || donate ? handle_VOTE_DONATE : undefined}
          contentData={{
            _id,
            title: title || 'Reeplay',
            desc: '',
            logo: channelImg || null,
            viewsCount: route.params.viewsCount ?? 0,
            vidClass: 'free',
          }}
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar hidden />
      {orientation === 'LANDSCAPE-LEFT' && show ? (
        <View
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
          }}>
          {/* Background Video */}
          {Platform.OS === 'android' ? (
            <View
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                zIndex: 10,
              }}>
              <BlurView
                backgroundColor="rgba(255, 255, 255, 0.1)"
                blurRadius={20}
              />
            </View>
          ) : (
            <Blur
              blurAmount={30}
              overlayColor="transparent"
              blurType="dark"
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                zIndex: 10,
              }}
            />
          )}
          <AppVideo
            source={{
              uri: videoURL,
            }}
            videoRef={videoRef2}
            style={{
              width: '100%',
              height: '100%',
            }}
            resizeMode="stretch"
            fullscreen
            fullscreenOrientation="landscape"
            muted={true}
            paused={true}
          />

          {/* Main video component */}
          <View
            key={key}
            onLayout={() => {
              console.log('first layout');
            }}
            style={{
              position: 'absolute',
              width: Size.getWidth(),
              height: Platform.OS === 'ios' ? '105.8%' : '100%',
              zIndex: 20,
            }}>
            <AppScreen
              containerStyle={{
                position: 'relative',
                paddingBottom: 0,
                backgroundColor: isLoading ? colors.DEEP_BLACK : 'transparent',
              }}>
              {/* Cover photo */}
              {/* {cover && (
                <FastImage
                  source={{
                    uri: coverImg,
                    priority: FastImage.priority.normal,
                    cache: FastImage.cacheControl.immutable,
                  }}
                  resizeMode={FastImage.resizeMode.cover}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    zIndex: 15,
                  }}
                />
              )} */}

              {!isLoading ? (
                <>
                  <AnimatedLinear
                    colors={['transparent', 'rgb(0, 0, 0)']}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      height: 81,
                      width: '100%',
                      zIndex: 20,
                      opacity: opacityU.current,
                      // transform: [{translateY: transD.current}],
                    }}
                  />
                  <AnimatedLinear
                    colors={['rgba(0, 0, 0, 0.6)', 'transparent']}
                    style={{
                      position: 'absolute',
                      top: 0,
                      height: 70,
                      width: '100%',
                      zIndex: 20,
                      opacity: opacityU.current,
                      // transform: [{translateY: transU.current}],
                    }}
                  />

                  {/* Brightness View */}
                  <Animated.View
                    style={{
                      position: 'absolute',
                      width: '6%',
                      height: '78%',
                      zIndex: 40,
                      top: 30,
                      justifyContent: 'center',
                      opacity: opacityU.current,
                    }}>
                    <AppView style={{ alignSelf: 'center' }} className="ml-[5px]">
                      <BrightnessIcon />
                    </AppView>
                    <AppView className="relative mt-3 overflow-hidden h-[200px] w-[60%]">
                      <AppView className="h-[200px] w-[6px] absolute right-0 items-center bg-[#535353] rounded-[5px]" />
                      <BrightnessBar />
                    </AppView>
                  </Animated.View>

                  {/* Middle */}
                  <AnimatedPressable
                    onPress={() => setHide(!hide)}
                    style={[
                      styles.overlay,
                      {
                        backgroundColor: isBufferingLoad
                          ? 'rgba(0, 0, 0, 0.2)'
                          : 'transparent',

                        opacity: opacityU.current,
                      },
                    ]}>
                    <TouchableOpacity
                      onPress={() => handleSeek(currentTime - 10)}>
                      <SeekBackIcon />
                    </TouchableOpacity>
                    {isBufferingLoad ? (
                      <AppView className="mx-16 w-[50px] h-[70px] justify-center">
                        <LottieView
                          source={require('@/assets/icons/RPlay.json')}
                          style={{
                            width: 350,
                            height: 350,
                            alignSelf: 'center',
                          }}
                          autoPlay
                          loop
                        />
                      </AppView>
                    ) : (
                      <TouchableOpacity
                        style={{
                          marginHorizontal: 64,
                          width: 50,
                          height: 70,
                          justifyContent: 'center',
                        }}
                        onPress={() => [
                          setIsPlaying(!isPlaying),
                          setCover(false),
                        ]}>
                        {isPlaying ? (
                          <B_PlayBtn />
                        ) : (
                          <B_PauseBtn style={{ marginLeft: -20 }} />
                        )}
                      </TouchableOpacity>
                    )}
                    <AnimatedTouchable
                      style={{
                        marginLeft: -8,
                        // opacity: opacityU.current
                      }}
                      onPress={() => handleSeek(currentTime + 10)}>
                      <SeekForwardIcon />
                    </AnimatedTouchable>
                  </AnimatedPressable>

                  {/* Top */}
                  <Animated.View
                    style={[
                      styles.topView,
                      { transform: [{ translateY: transU.current }] },
                    ]}>
                    <AppView className="ml-7 flex-row items-center">
                      {channelImg && channelImg !== '' && (
                        <AppImage
                          source={channelImg}
                          className="w-[28px] h-[28px] rounded-full mr-2"
                        />
                      )}

                      <AppText className="font-ROBOTO_500 text-white text-[11px]">
                        {title || 'Video title'}
                      </AppText>
                    </AppView>
                    <AppView className="flex-row items-center gap-x-2">
                      <Casting />
                      <TouchableOpacity onPress={existFullscreen}>
                        <BigClose />
                      </TouchableOpacity>
                    </AppView>
                  </Animated.View>

                  {/* Bottom */}
                  <Animated.View
                    style={[
                      styles.bottomView,
                      {
                        transform: [{ translateY: transD.current }],
                      },
                    ]}>
                    <AppView className="flex-row items-center gap-x-4">
                      <AppView
                        style={{ width: isTime ? 65 : 50 }}
                        className=" justify-center flex-row items-center gap-x-2">
                        {type === fullVideoType.live && isTime && (
                          <>
                            <MotiView
                              from={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{
                                type: 'timing',
                                duration: 1000,
                                easing: Easing.out(Easing.ease),
                                loop: true,
                              }}>
                              <AppView className="w-[9px] h-[9px] rounded-full bg-red" />
                            </MotiView>
                            <AppText className="font-ROBOTO_500 text-[11px] text-white">
                              LIVE
                            </AppText>
                          </>
                        )}
                      </AppView>

                      <TouchableOpacity
                        style={{ height: 17, marginBottom: 5 }}
                        onPress={setMuteVideo}>
                        {muteVideo ? (
                          <AppView className="mt-[3px]">
                            <MutedIcon />
                          </AppView>
                        ) : (
                          <VolumeIcon />
                        )}
                      </TouchableOpacity>
                    </AppView>

                    <AppView className="flex-row items-center">
                      {type !== fullVideoType.live && (
                        <>
                          {!upcoming && (
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginRight: 16,
                              }}>
                              <NextIcon />
                              <AppText className="ml-[5px] font-ROBOTO_700 text-white text-[10px]">
                                Next
                              </AppText>
                            </TouchableOpacity>
                          )}
                          {type === fullVideoType.series && !upcoming && (
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginRight: 16,
                              }}>
                              <EpisodesMenu />
                              <AppText className="ml-[5px] font-ROBOTO_700 text-white text-[10px]">
                                Episodes
                              </AppText>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}>
                            <SubtitleIcon />
                            <AppText className="ml-[5px] font-ROBOTO_700 text-white text-[10px]">
                              Audio/Subtitle
                            </AppText>
                          </TouchableOpacity>
                        </>
                      )}

                      {type == fullVideoType.live && channelImg && (
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginRight: 5,
                          }}>
                          <NextIcon />
                          <AppText className="ml-[5px] font-ROBOTO_700 text-white text-[10px]">
                            Next
                          </AppText>
                        </TouchableOpacity>
                      )}

                      {type === fullVideoType.live && (donate || vote) && (
                        <TouchableOpacity
                          onPress={handle_VOTE_DONATE}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginRight: 16,
                          }}>
                          <AppView className="-mb-[10px]">
                            <Donate_VoteIcon />
                          </AppView>
                          <AppText className="ml-[5px] font-ROBOTO_700 text-[#FFCC00] text-[13px]">
                            {donate && 'Donate'}
                            {vote && 'Vote'}
                          </AppText>
                        </TouchableOpacity>
                      )}

                    </AppView>
                  </Animated.View>

                  {/* SeekBar */}
                  {type !== fullVideoType.live && (
                    <Animated.View
                      style={[
                        styles.progressBar,
                        { transform: [{ translateY: transD.current }] },
                      ]}>
                      <AppView style={styles.durationSlot}>
                        <AppText
                          numberOfLines={1}
                          className="text-white text-[13px] font-OUTFIT_500">
                          {formatDuration(duration)}
                        </AppText>
                      </AppView>
                      <AppView
                        style={{
                          width:
                            Platform.OS === 'android'
                              ? Size.getWidth() - 220
                              : seekWidth - 180,
                        }}
                        className="items-center h-[15px] mx-3 rounded-[5px] overflow-hidden">
                        <AppView className="h-1 w-full bg-grey_white_90 rounded-[5px] mt-1.5">
                          {!isLoading && (
                            <SeekBar
                              duration={duration}
                              currentTime={currentTime}
                              setCurrentTime={setCurrentTime}
                              handleSeek={handleSeek}
                              setIsPlaying={setIsPlaying}
                              setFixed={setFixed}
                              seekWidth={seekWidth - 180}
                            />
                          )}
                        </AppView>
                      </AppView>
                      <AppView style={styles.durationSlot}>
                        <AppText
                          numberOfLines={1}
                          className="text-white text-[13px] font-OUTFIT_500 text-right">
                          {formatDuration(currentTime)}
                        </AppText>
                      </AppView>
                    </Animated.View>
                  )}
                </>
              ) : (
                <AppView className="absolute w-full h-full items-center justify-center z-30">
                  <LottieView
                    source={require('@/assets/icons/RPlay.json')}
                    style={{
                      width: 270,
                      height: 270,
                    }}
                    autoPlay
                    loop
                  />
                </AppView>
              )}

              <View ref={myViewRef} style={{ width: '100%', height: '100%' }}>
                <AppVideo
                  poster={coverImg}
                  posterResizeMode='cover'
                  source={resolvePlaybackSource(videoURL, 'vod')}
                  videoRef={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="stretch"
                  fullscreen
                  fullscreenOrientation="landscape"
                  muted={muteVideo}
                  paused={isPlaying}
                  onLoad={onLoad}
                  onLoadStart={onLoadStart}
                  onProgress={onProgress}
                  onEnd={onEnd}
                  onSeek={onSeek}
                  onBuffer={onBuffer}
                  onReadyForDisplay={onReadyForDisplay}
                  preferredForwardBufferDuration={12}
                  useTextureView={false}
                  controls={false}
                  disableFocus={true}
                  hideShutterView
                  minLoadRetryCount={5}
                  shutterColor='transparent'
                />
              </View>
            </AppScreen>
          </View>
        </View>
      ) : (
        <AppView className="w-full h-full bg-black" />
      )}
    </>
  );
};

export default FullScreenModal;

const styles = StyleSheet.create({
  approvedPlayer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    position: 'absolute',
    right: 0,
    top: -13,
    width: '100%',
    height: '105%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  bottomView: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 6 : Size.getWidth() < 658 ? 25 : 10,
    marginBottom: Platform.OS === 'ios' ? 4 : 13,
    paddingHorizontal: 8,
    paddingRight: 20,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  topView: {
    width: '100%',
    position: 'absolute',
    top: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  progressBar: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 55 : Size.getWidth() < 668 ? 58 : 42,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 30,
    alignSelf: 'center',
  },
  durationSlot: {
    width: 80,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
});
