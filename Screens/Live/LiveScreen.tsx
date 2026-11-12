import {
  Animated,
  RefreshControl,
  StatusBar,
  VirtualizedList,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import Header from '@/Screens/Home/Header';
import colors from '@/configs/colors';
import Slider from '@/Screens/Home/components/SliderContainer';
import DynamicViewContainer from './DynamicViewContainer';
import Size from '@/Utils/useResponsiveSize';
import Orientation from 'react-native-orientation-locker';
import { useAppDispatch, useAppSelector } from '@/Hooks/reduxHook';
import { selectBannerContent } from '@/store/slices/bannerSlice.slice';
import { resetLiveVideo, selectFullVideoProps, selectLiveModalContent } from '@/store/slices/fullScreenVideo.slice';
import FullscreenModalPlayer from './FullscreenModalPlayer';
import { OrientationInjectedProps } from '@/components/OrientationWrapper';
import AppModal from '@/components/AppModal';
import LiveInfoModal from './components/LiveInfoModal';
import { setHideTabBar } from '@/store/slices/userSlice';
import { ILiveContent, IVODContent } from '@/types/api/content.types';
import { useIsFocused } from '@react-navigation/native';
import {useTabBarCompactOnScroll} from '@/navigation/useTabBarCompactOnScroll';
import {useSharedValue} from 'react-native-reanimated';
import {bannerApi} from '@/api/content.api';
import {setBannerContent} from '@/store/slices/bannerSlice.slice';

const LiveScreen = ({isFullscreen,makeFullscreen,makePortrait}:OrientationInjectedProps) => {
  const headerScrollY = useSharedValue(0);
  const scrollY2 = useRef(new Animated.Value(0)).current;
  const {reportScrollOffset} = useTabBarCompactOnScroll();
  const live = useAppSelector(selectBannerContent).lives
  const isFullscreenContent = useAppSelector(selectFullVideoProps);
  const isLiveModalContent = useAppSelector(selectLiveModalContent);
  const [currentContentState, setContentState] = useState<IVODContent|ILiveContent|null>(isFullscreenContent)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const dispatch = useAppDispatch();
      const isFocused = useIsFocused();

  // function makeFullscreen(){
  //   runFullscreen()
  // }

  const getItemCount = () => 1;

  const getItem = (_data: any, index: number) => index;

  const renderItem = () => {
    return (
      <>
        <Slider data={live} live makeFullscreen={makeFullscreen}  />
        <DynamicViewContainer key={refreshKey} scrollY={scrollY2} makeFullscreen={makeFullscreen} />
      </>
    );
  };

  async function handleRefresh() {
    try {
      setIsRefreshing(true);
      setRefreshKey(previous => previous + 1);
      const response = await bannerApi();
      if (response.ok && response.data?.data) {
        dispatch(setBannerContent(response.data.data));
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const onScroll = (event: {nativeEvent: {contentOffset?: {y?: number}}}) => {
    const y = event.nativeEvent.contentOffset?.y ?? 0;
    headerScrollY.value = y;
    scrollY2.setValue(y);
    reportScrollOffset(y);
  };

  function checkOrientation() {
   if(!isFullscreen) Orientation.lockToPortrait();
  }

  useEffect(() => {
    checkOrientation();
    if(!isFullscreen && isFullscreenContent){
      dispatch(setHideTabBar(true))
    }else{
      dispatch(setHideTabBar(isFullscreen))
    }
  }, [isFullscreen]);

  useEffect(() =>{
    if(!currentContentState) setContentState(isFullscreenContent)
  }, [isFullscreenContent])

   useEffect(() =>{
    if(!isFullscreenContent) return;
    if(isFocused && !currentContentState) {
      setContentState(isFullscreenContent)
      makeFullscreen();
      dispatch(setHideTabBar(true))
    } 
  }, [isFocused]);


  return (
    <>
          <StatusBar
            hidden={isFullscreen || isFullscreenContent !== null}
            translucent
            barStyle="light-content"
            backgroundColor="transparent"
          />
      {(!isFullscreen && !(isFullscreenContent && !currentContentState)) &&  <>
          <VirtualizedList
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate="normal"
            bounces
            alwaysBounceVertical
            extraData={refreshKey}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.RED}
                colors={[colors.RED]}
              />
            }
            showsVerticalScrollIndicator={false}
            style={{
              backgroundColor: colors.DEEP_BLACK,
              position: 'relative',
            }}
            getItemCount={getItemCount}
            getItem={getItem}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
          />

          <Header scrollY={headerScrollY} />

 <AppModal
        isModalVisible={isLiveModalContent !== null}
        handleClose={() => dispatch(resetLiveVideo())}
        style={{padding:0, margin:0, marginLeft:0, height:Size.hp(50)}}
        hideCloseBtn
        hideLoge
        replaceDefaultContent={
          <>
           {isLiveModalContent && <LiveInfoModal 
              item={isLiveModalContent}
              handleClose={() => dispatch(resetLiveVideo())}
              makeFullscreen={makeFullscreen}
              isBanner
            />}
          </>
        }
      />
        </>}
     

      {(isFullscreenContent && isFullscreen) && <FullscreenModalPlayer 
        currentContentState={currentContentState}
        setContentState={setContentState}
        isFullscreen={isFullscreen}
        content={isFullscreenContent}
        setFullscreen={() => isFullscreen ? [makePortrait()] : makeFullscreen()} 
      />}     
    </>
  );
};

export default LiveScreen;
