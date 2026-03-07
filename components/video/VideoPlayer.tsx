import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Video, {
  AdEvent,
  ISO639_1,
  SelectedTrackType,
  TextTracks,
  TextTrackType,
  type OnLoadData,
  type OnProgressData,
  type VideoRef,
} from 'react-native-video';
import {
  GestureResponderEvent,
  ImageSourcePropType,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { VideoPlayerProps } from 'react-native-video-player';
import { Controls, ProgressRef } from './Controls';
import { IContentData } from './DynamicVideoComponent';
import LottieView from 'lottie-react-native';
import { getSubtitles, registerContinueWatching, updateViewsCount } from '@/api/content.api';
import { srtToVtt } from '@/Utils/contentUtils';
import RNFS from 'react-native-fs';
import Subtitles from 'react-native-subtitles'
import SubtitlePlayer from 'react-native-video-subtitle'
import { MediaInfo, useCastSession, useRemoteMediaClient } from 'react-native-google-cast';
import { throttle } from 'lodash';
import { IRegisteredContinueWatching } from '@/types/api/content.types';

const demoAds = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpostoptimizedpodbumper&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&impl=s&cmsid=496&vid=short_onecue&correlator='

export interface ISubtitle{
  title:string;
  language:ISO639_1;
  type: TextTrackType;
  uri:string
}

export interface VideoInternalRef extends VideoRef {
  onStart: () => void;
}

type RenderVideoProps = Pick<
  VideoPlayerProps,
  | 'animationDuration'
  | 'autoplay'
  | 'controlsTimeout'
  | 'customStyles'
  | 'defaultMuted'
  | 'disableControlsAutoHide'
  | 'disableFullscreen'
  | 'disableSeek'
  | 'duration'
  | 'fullScreenOnLongPress'
  | 'hideControlsOnStart'
  | 'muted'
  | 'onEnd'
  | 'onHideControls'
  | 'onLoad'
  | 'onMutePress'
  | 'onPlayPress'
  | 'onPlaybackStateChanged'
  | 'onProgress'
  | 'onShowControls'
  | 'pauseOnPress'
  | 'paused'
  | 'repeat'
  | 'resizeMode'
  | 'showDuration'
  | 'source'
  | 'style'
> & {
  sizeStyle: { width: number; height: number };
  onToggleFullScreen: () => void;
  handleCTAFunc?: () => void;
  handleNEXT?: () => void;
  handleSUBTITLE?: () => void;
  type?: string;
  ctaType?: 'vote' | 'donate';
  isTime: boolean;
  isFullscreen: boolean;
  thumbnail: ImageSourcePropType | undefined;
  handleGoBackFunc?: () => void;
  contentData: IContentData;
  isSaveProgress?: boolean;
  // videoRef: React.RefObject<VideoRef | null>
};

export const RenderVideo = forwardRef<VideoInternalRef, RenderVideoProps>(
  (props, ref) => {
  const {
    autoplay = false,
    controlsTimeout = 5000,
    hideControlsOnStart = false,
    disableControlsAutoHide,
    source,
    resizeMode = 'contain',
    muted,
    paused,
    repeat,
    style,
    sizeStyle,
    onToggleFullScreen,
    isFullscreen,
    isSaveProgress,
    ...rest
  } = props;

  /* ---------------- STATE ---------------- */
  const [subtitle, setSubtitle] = useState<ISubtitle[]>([])
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(!!muted);
  const [progress, setProgress] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(
    !hideControlsOnStart
  );
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [videoKey, setVideoKey] = useState(0);
  const session = useCastSession();
  const remoteClient = useRemoteMediaClient();
  const isCasting = !!session && !!remoteClient;

  /* ---------------- REFS ---------------- */
  const videoRef = useRef<VideoRef>(null);
  const controlsRef = useRef<ProgressRef>(null);
  const progressRef = useRef(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------------- HELPERS ---------------- */
  const clearControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  };

 const scheduleAutoHide = useCallback(() => {
  clearControlsTimeout();

  if (
    disableControlsAutoHide ||
    !isPlaying ||
    !isControlsVisible
  ) {
    return;
  }

  controlsTimeoutRef.current = setTimeout(() => {
    setIsControlsVisible(false);
  }, controlsTimeout);
}, [
  controlsTimeout,
  disableControlsAutoHide,
  isPlaying,
  isControlsVisible,
]);

  const showControls = () => {
    clearControlsTimeout();
    setIsControlsVisible(true);
  };

  const hideControls = () => {
    if(disableControlsAutoHide) return
    clearControlsTimeout();
    // console.log('hide controls..');
    setIsControlsVisible(false);
  };

 
  /* ---------------- VIDEO EVENTS ---------------- */
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);

    if (progressRef.current >= 1) {
      videoRef.current?.seek(0);
    }

    showControls();
  }, []);

  const handleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    showControls();
  }, []);

  const handleSeek = useCallback((seconds: number) => {
    videoRef.current?.seek(seconds);
    showControls();
  }, []);

    const lastWatchedRef = useRef(0);

  const saveProgress = useCallback(
    throttle(async (time: number) => {
      try {
        const data:IRegisteredContinueWatching = {duration:time,totalDuration:duration,parentId:props.contentData._id,parentType: props.type === 'series' ? 'episode' :'vod'}
        const res = await registerContinueWatching(data);
        console.log(res.data, data)
      } catch (err) {
        console.error("Failed to save progress", err);
      }
    }, 15000), // send at most once every 15s
    [duration]
  );

    async function removeSaveWatch(){
      saveProgress.flush?.();
    }

  const handleProgress = useCallback(
    (e: OnProgressData) => {
      const next = e.currentTime/duration
      progressRef.current = next;
      setProgress(next); 
      controlsRef.current?.onProgress(next);
      
      // handles views count
       if (props.type !== 'live') {
      const isFree = props.contentData.vidClass === 'free';
        if(isSaveProgress && !disableControlsAutoHide && !isLoading) {
          lastWatchedRef.current = e.currentTime;
          saveProgress(e.currentTime)
        }
      if (isFree && next >= 0.6) {      // Free video, watched at least 60%
        handleViews();
      } else if (!isFree && next >= 0.3) {  // Paid or other video, watched at least 30%
        handleViews();
      }
    }
      
    },
    [duration, isLoading, disableControlsAutoHide]
  );

  async function handleViews(){
    if(disableControlsAutoHide) return
    const res =  await updateViewsCount({content:props.contentData._id, contentType:'vod'})
    // console.log('updated views count....', res.data,props.contentData._id)
  }
  
  async function fetchAndConvertSubtitles(url: string): Promise<string> {
  const res = await fetch(url);
  const srtText = await res.text();
  return srtToVtt(srtText);
}


async function saveVttFile(vtt: string, fileName = 'subtitles.vtt') {
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  await RNFS.writeFile(path, vtt, 'utf8');
  return `file://${path}`;
}

 async function handleSubtitles() {
  const res = await getSubtitles({ parentId: '690a1202b672324134d81710' });

  if (!res.ok || !res.data) return;

  const data: ISubtitle[] = await Promise.all(
    res.data.data.map(async (x) => {
      const vtt = await fetchAndConvertSubtitles(x.src);
      const vttUri = await saveVttFile(vtt, `${x.language}.vtt`);
      // console.log(vtt)

      return {
        language: 'en',
        title: x.language,
        uri: x.src,
        type: TextTrackType.VTT,
      };
    })
  );

  setSubtitle(data);
    setVideoKey((k) => k + 1);

}

  const handleBuffer = useCallback((e: { isBuffering: boolean }) => {
  setIsLoading(e.isBuffering);
}, []);

  const handleLoad = useCallback((e: OnLoadData) => {
    setDuration(e.duration);
    setIsLoading(false);
    console.log(props.contentData.seekTo)
    if(props.contentData.seekTo) handleSeek(props.contentData.seekTo)
  }, []);

  const handleEnd = useCallback(() => {
    controlsRef.current?.onProgress(1);
if(isSaveProgress) {
          saveProgress(duration);
          removeSaveWatch()
        }
    if (repeat) {
      videoRef.current?.seek(0);
    }
    setIsPlaying(repeat ?? false);
    showControls();
    rest.onEnd?.();
  }, [repeat]);

  /* ---------------- IMPERATIVE ---------------- */
  // If you want, you can still use useImperativeHandle inside parent
  useImperativeHandle(ref, () => ({
    ...(videoRef.current as VideoRef),
    onStart: () => {
      setIsPlaying(true);
      showControls();
    },
  }));

   useEffect(() => {
        if (isCasting && remoteClient && source?.uri) {
            // Stop local playback before casting
            setIsPlaying(false);
            videoRef.current?.pause();

            const mediaInfo: MediaInfo = {
                contentUrl: typeof source.uri === 'string' ? source.uri :'',
                contentType: 'video/mp4',
                metadata: {
                    type: 'generic',
                    title: props.contentData.title,
                    subtitle: props.contentData.desc, // Dynamically set this
                    images: [{ url:typeof props.thumbnail === 'string'? props.thumbnail:'' }],
                },
            };

            remoteClient.loadMedia({...mediaInfo, autoplay: true, startTime: progressRef.current * duration })
                .then(() => console.log(`[${new Date().toLocaleTimeString()}] Media loaded on Cast device.`))
                .catch(error => console.error(`[${new Date().toLocaleTimeString()}] Failed to load media on Cast device:`, error));

            // showControls();

        } 
        // else if (!isCasting && !session) {
        //     console.log(`[${new Date().toLocaleTimeString()}] Casting session ended. Resetting local player.`);
        //     setIsPlaying(false);
        //     videoRef.current?.pause();
        //     _showControls();
        // }
    }, [isCasting, remoteClient, source, session]);

  useEffect(() => {
  scheduleAutoHide();

  return clearControlsTimeout;
}, [scheduleAutoHide]);

useEffect(() =>{
  handleSubtitles();
}, []);

// console.log(props.contentData.watchedDocumentId)


  /* ---------------- RENDER ---------------- */
  return (
    <View style={{ flex: 1 }}>
      <Video
      // key={videoKey}
        ref={videoRef}
        source={{...source, 
          ad:{
            adTagUrl:(props.contentData.vidClass.toLowerCase()==='free' && !disableControlsAutoHide) ? demoAds :undefined 
          }
        }}
        style={[styles.video, sizeStyle, style]}
        paused={paused || !isPlaying}
        muted={isMuted}
        resizeMode={resizeMode}
        onProgress={handleProgress}
        onLoad={handleLoad}
        onEnd={handleEnd}
        onBuffer={handleBuffer}
          // selectedTextTrack={{
          //   type:SelectedTrackType.LANGUAGE,
          //   value:'en'
          // }}
        // onTextTracks={e => console.log(e,subtitle)}
        // onTextTrackDataChanged={e => console.log(e)}
        // onReceiveAdEvent={e => e.event === AdEvent.COMPLETED ? console.log('show content') : e.event === AdEvent.AD_PROGRESS ? console.log('hide controls') : null}
      />

     <View style={{bottom:isControlsVisible?45:4}} className='w-full h-20 absolute z-50'>
       {/* {subtitle.length > 0 && <Subtitles
      {...{ currentTime:progress*duration }}
      containerStyle={{borderWidth:1, borderColor:'white', width:'80%', height:50, marginHorizontal:'auto',}}
      textStyle={{color:'white'}}
      selectedsubtitle={{
        file: subtitle[0].uri,
      }}
    />} */}
    {/* {subtitle.length > 0 && <SubtitlePlayer
      currentTime={progress*duration}
            style={{borderWidth:1, borderColor:'white', width:'80%', height:50, marginHorizontal:'auto'}}
      subtitle={{
         uri : subtitle[0].uri,
        //  translationUri:'translation.srt'
      }}
    />} */}
     </View> 

      {(isLoading) && <View className='absolute w-full h-[80%] top-[10%] items-center justify-center z-[99px]'>
          {isFullscreen ? 
          <>
          <View className="mx-16 w-[50px] h-[70px] justify-center -mt-6">
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
            </View>
          </>
          :<>
          <View>
             <LottieView
                source={require('@/assets/icons/RPlay.json')}
                style={{
                  width: 200,
                  height: 200,
                }}
                autoPlay
                loop
              />
          </View>
          </>}
        </View>}

      <TouchableOpacity
        activeOpacity={1}
        style={StyleSheet.absoluteFill}
        onPress={isControlsVisible ? hideControls : showControls}
      >
        <Controls
          {...props}
          progress={progress}
          duration={duration}
          isPlaying={isPlaying}
          isMuted={isMuted}
          isControlsVisible={isControlsVisible}
          isFullscreeen={isFullscreen}
          isLoading={isLoading}
          onPlayPress={handlePlayPause}
          onMutePress={handleMute}
          onSeek={handleSeek}
          onToggleFullScreen={onToggleFullScreen}
          setIsPlaying={setIsPlaying}
          showControls={showControls}
          handleGoBackFunc={rest.handleGoBackFunc}
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  video:
    +Platform.Version >= 24
      ? {}
      : {
          backgroundColor: 'black',
        },
  overlayButton: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 99999,
  },
});
