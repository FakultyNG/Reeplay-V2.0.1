import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
  AppHeader,
  AppImage,
  AppScreen,
  AppText,
  AppView,
  TouchableOpacity,
} from '@/components';
import colors from '@/configs/colors';
import Size from '@/Utils/useResponsiveSize';
import {CloseBtn_S, SearchIcon_S} from '@/assets/icons';
import fonts from '@/configs/fonts';
import BlurView from 'react-native-blur-effect';
import {BlurView as Blur} from '@react-native-community/blur';
import { useAppDispatch, useAppSelector } from '@/Hooks/reduxHook';
import { selectAdsContent, setAdsContent } from '@/store/slices/adsSlice.slice';
import { ILiveContent, IVODContent } from '@/types/api/content.types';
import { fetchContentSuggestions, hasPaidContentStatus, randomAds, recentSearches, registerRecentSearch, searchContent } from '@/api/content.api';
import FastImage from 'react-native-fast-image';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { previewContentType, RootNav } from '@/navigation/AppNavigator';
import { setPreviewContent } from '@/store/slices/previewContentSlice';
import routes from '@/navigation/routes';
import Placeholder from '@/components/SkeletonLoader';
import AppModal from '@/components/AppModal';
import FullscreenModalPlayer from '../Live/FullscreenModalPlayer';
import { resetFullVideo, resetLiveVideo, selectFullVideoProps, selectLiveModalContent, setFullVideoProps, setLiveModalContent } from '@/store/slices/fullScreenVideo.slice';
import LiveInfoModal from '../Live/components/LiveInfoModal';
import { OrientationInjectedProps } from '@/components/OrientationWrapper';
import ToastNotification from '@/components/ToastNotifications';
import { isAndroid } from '@/configs/constant';
import {useGuestAccessStore} from '@/store/guestAccess.store';
import {rankSearchResults} from '@/Utils/searchRelevance';
import {queueAnalyticsEvent} from '@/api/analytics.api';
import {useLiveFeatureStore} from '@/store/liveFeature.store';
import SurfaceAdCard from '@/components/SurfaceAdCard';

const Search = ({isFullscreen,makeFullscreen,makePortrait}:OrientationInjectedProps) => {
  const {navigate} = useNavigation<RootNav>()
  const ads = useAppSelector(selectAdsContent).ads;
  const [text, setText] = useState<string>('');
  const [keyboardHeight, setKeyboardHeight] = useState<number | null>(null);
  const [recentSearch, setRecentSearches] = useState<(IVODContent|ILiveContent)[]>([])
  const [suggestions, setSuggestions] = useState<(IVODContent|ILiveContent)[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [contents, setContents] = useState<(IVODContent|ILiveContent)[]>([])
  const searchRequestId = useRef(0);
  const dispatch = useAppDispatch();
  const isFullscreenContent = useAppSelector(selectFullVideoProps);
  const isLiveModalContent = useAppSelector(selectLiveModalContent);
  const isGuest = useGuestAccessStore(state => state.isGuest);
  const liveEnabled = useLiveFeatureStore(state => state.enabled);
  const [currentContentState, setContentState] = useState<IVODContent|ILiveContent|null>(isFullscreenContent)
        const isFocused = useIsFocused();
  

  async function handleContentClick(item:(IVODContent|ILiveContent), canView?:boolean){
    queueAnalyticsEvent({
      eventType: 'content_select',
      contentId: item._id,
      contentType: 'adminId' in item ? 'vod' : 'live',
      sourceScreen: 'Search',
    });
    if (!isGuest) {
      await registerRecentSearch({contentId:item._id, contentType:'adminId' in item ?'vod' :'live'});
    }
    // HANDLING NAVIGATION
    if('adminId' in item){
      dispatch(setPreviewContent(item));
      navigate(routes.PREVIEW_SCREEN, {
        content: item.type.includes('series') ? previewContentType['tv series'] : item.type.includes('video') ? previewContentType['music video'] : previewContentType.film,
        videoURL: 'adminId' in item ? item.trailer :'',
      });
    }else{
      //CAN VIEW ISSUE
      if(canView){
        dispatch(setFullVideoProps(item));
        setTimeout(() => makeFullscreen(),4000);
      }else{
        dispatch(setLiveModalContent(item));
      }
    }
  }


  const handleSuggestions = useCallback(async () => {
    const resSug = await fetchContentSuggestions();
    if(resSug.ok && resSug.data){
      const data = resSug.data.data
      const items = data.items ?? [...data.vods, ...data.lives];
      setSuggestions(items.filter(item => liveEnabled || 'adminId' in item));
    }
  }, [liveEnabled]);

  const handleRecentSearches = useCallback(async () => {
    if (isGuest) {
      setRecentSearches([]);
      return;
    }
    const res = await recentSearches();
    if(res.ok && res.data){
      const data = res.data.data
      setRecentSearches([
        ...data.vods,
        ...(liveEnabled ? data.lives : []),
      ]);
    }
  }, [isGuest, liveEnabled]);

  const handleGetAds = useCallback(async () => {
    const resAds = await randomAds();
    if(resAds.ok && resAds.data) dispatch(setAdsContent(resAds.data.data))
  }, [dispatch]);

  const handleSearchContent = useCallback(async (key:string, requestId:number) => {
    try {
      setLoading(true);

      const res = await searchContent(key);
      if (requestId !== searchRequestId.current) return;

      if(res.ok && res.data){
        const data = [
          ...res.data.data.vods,
          ...(liveEnabled ? res.data.data.events : []),
        ]
        setContents(rankSearchResults(data, key));
        queueAnalyticsEvent({
          eventType: 'search',
          searchTerm: key.trim().toLowerCase().slice(0, 100),
          sourceScreen: 'Search',
        });
      }else{
        ToastNotification('error', `${res.data?.message}`)
      }
    } catch (error) {
      ToastNotification('error', `${error}`)
    }finally{
      if (requestId === searchRequestId.current) setLoading(false);
    }
  }, [liveEnabled]);

  useEffect(() => {
    const query = text.trim();
    const requestId = ++searchRequestId.current;

    setContents([]);
    if (!query) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearchContent(query, requestId);
    }, 500);

    return () => clearTimeout(timer);
  }, [handleSearchContent, text]);

  useEffect(() => {
    const showKeyboard = Keyboard.addListener(
      'keyboardDidShow',
      (event: KeyboardEvent) => {
        // Extract keyboard height from the event
        const {height} = event.endCoordinates;
        // Set the keyboard height in state
        setKeyboardHeight(height);
      },
    );
    const hideKeyboard = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(null);
    });

    return () => {
      showKeyboard.remove();
      hideKeyboard.remove();
    };
  }, []);

  useLayoutEffect(() =>{
    handleGetAds();
    handleRecentSearches();
    handleSuggestions();
  }, [handleGetAds, handleRecentSearches, handleSuggestions]);

   useEffect(() =>{
      if(!currentContentState) setContentState(isFullscreenContent)
    }, [currentContentState, isFullscreenContent])

    useEffect(() =>{
      if(isFocused && !isFullscreen) dispatch(resetFullVideo())
    },[dispatch, isFocused, isFullscreen])

  useEffect(() =>{
      if(!isFullscreenContent) return;
      if(isFocused && !currentContentState) {
        setContentState(isFullscreenContent)
        makeFullscreen();
      } 
    }, [currentContentState, isFocused, isFullscreenContent, makeFullscreen]);

  return (
    <>
    {!isFullscreen && !(isFullscreenContent && !currentContentState) && <AppScreen
      containerStyle={{
        paddingTop: 10,
        paddingBottom: 0,
        paddingHorizontal: 0,
        position: 'relative',
      }}>
        <StatusBar hidden={false} />
      <AppView className="px-5 flex-row items-center mb-2  relative">
        <AppHeader style={{width: 50}} />
        <AppView className="flex-1 -ml-[50px] z-[-10]">
          <AppText className="font-ROBOTO_700 text-[15px] text-white text-center">
            Search
          </AppText>
          {text !== '' && (
            <TouchableOpacity
              onPress={() => setText('')}
              className="absolute right-5">
              <AppText className="font-ROBOTO_400 text-center text-[15px] text-white">
                Cancel
              </AppText>
            </TouchableOpacity>
          )}
        </AppView>
      </AppView>
      {text === '' ? (
        <ScrollView style={[{height: Size.getHeight() - 300}]}>
          <AppView className="px-5 pb-20">
            {(ads && ads.length > 0) ? (
              <SurfaceAdCard sourceScreen="Search" style={styles.adCard} />
            ) : null}

          {recentSearch.length > 0 &&  <AppView className="mt-6 rounded-[15px] overflow-hidden bg-[#1A1A1A]">
              <AppView className="bg-[#1A1A1A] rounded-t-[15px] pt-5 pb-4 px-[18px]">
                <AppText className="font-ROBOTO_700 text-white text-lg">
                  RECENT
                </AppText>
                <AppText className="font-MANROPE_400 text-white text-[13px]">
                  Your recent searches
                </AppText>
              </AppView>
              <AppView className="bg-black border-x-[3px] pl-[10px] pt-2 border-b-[3px] rounded-b-[15px] border-[#1A1A1A] w-full h-[150px]">
                <FlatList
                  data={recentSearch}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({item}) => {
                    return (
                      <TouchableOpacity onPress={() => handleContentClick(item)} className="overflow-hidden w-[101px] h-[131px] mr-2 rounded-[10px]">
                        <AppImage
                          source={{uri: 'coverPhoto' in item ? item.coverPhoto:item.portraitPhoto}}
                          style={{width:'100%', height:'100%'}}
                          resizeMode='cover'
                        />
                      </TouchableOpacity>
                    );
                  }}
                />
              </AppView>
            </AppView>}

            {suggestions.length > 0 && <AppView className="mt-6 mb-3 rounded-[15px] overflow-hidden bg-[#1A1A1A]">
              <AppView className="bg-[#1A1A1A] rounded-t-[15px] pt-5 pb-4 px-[18px]">
                <AppText className="font-ROBOTO_700 text-white text-lg">
                  SUGGESTIONS
                </AppText>
              </AppView>
              <AppView className="bg-black border-x-[3px] pl-[10px] pt-2 border-b-[3px] rounded-b-[15px] border-[#1A1A1A] w-full h-[150px]">
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({item}) => {
                    return (
                      <TouchableOpacity onPress={() => handleContentClick(item)} className="overflow-hidden w-[101px] h-[131px] mr-2 rounded-[10px]">
                        <AppImage
                          source={{
                            uri: 'coverPhoto' in item ? item.coverPhoto : item.portraitPhoto,
                             priority:FastImage.priority.high,
                          }}
                          style={{
                            width:'100%',
                            height:'100%'
                          }}
                          resizeMode='cover'
                        />
                      </TouchableOpacity>
                    );
                  }}
                />
              </AppView>
            </AppView>}
          </AppView>
        </ScrollView>
      ) : (
        <ScrollView
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          <AppView style={styles.centerContent} className="pb-40 w-full mt-5">
            {contents.map((lib, index) => {  
              return <ContentItem key={`${lib._id}${index}`} lib={lib} handleContentClick={handleContentClick} />;
            })}
          </AppView>
        </ScrollView>
      )}

      <AppView
        style={
          keyboardHeight
            ? {marginBottom: keyboardHeight + (isAndroid ? -15:0)}
            : {}
        }
        className="absolute bottom-0 z-30 w-full">
        <AppView className="relative w-full items-center">
          {Platform.OS === 'android' ? (
            <AppView style={styles.blur}>
              <BlurView backgroundColor="rgba(0, 0, 0, 0.4)" blurRadius={50} />
            </AppView>
          ) : (
            <Blur blurType="dark" blurAmount={50} style={styles.blur} />
          )}
          <AppView
            style={{paddingVertical: Platform.OS === 'android' ? 6 : 18}}
            className="absolute top-3 mx-auto w-[95%] px-6 rounded-[40px] bg-black flex-row items-center z-50">
            <TouchableOpacity className="mr-3">
              {loading ? <ActivityIndicator size={'small'} /> : <SearchIcon_S />}
            </TouchableOpacity>
            <TextInput
              placeholder="Search Movies, Shows, Anime"
              placeholderTextColor={colors.GREY_WHITE}
              style={styles.input}
              value={text}
              onChangeText={setText}
            />
            <TouchableOpacity onPress={() => [setText(''), setContents([])]} className="ml-3">
              <CloseBtn_S />
            </TouchableOpacity>
          </AppView>
        </AppView>
      </AppView>
    </AppScreen>}

    {(isFullscreenContent && isFullscreen) && <FullscreenModalPlayer
            currentContentState={currentContentState}
            setContentState={setContentState}
            isFullscreen={isFullscreen}
            content={isFullscreenContent}
            setFullscreen={() => isFullscreen ? [makePortrait()] : makeFullscreen()} 
          />}
    
          {!isFullscreen &&<AppModal
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
          />}
    </>
  );
};

export default Search;

interface Props{
  lib:IVODContent|ILiveContent
  handleContentClick:(lib:IVODContent|ILiveContent, canView?:boolean) => void
}
export const ContentItem = ({lib, handleContentClick}:Props) =>{
  const [loading, setLoading] = useState<boolean>(true)
  const [contentIsPaid, setContentIsPaid] = useState<boolean>(false)
   const handleContentStatusUpdate = useCallback(async () => {
            if(lib.vidClass === 'free'){
              setContentIsPaid(true);
            }else{
              const res = await hasPaidContentStatus({contentType: 'coverPhoto' in lib ?'live':'vod', _id:lib._id})
              if(res.ok && res.data) setContentIsPaid(res.data.data.canView)
            }
          }, [lib])

          useEffect(() =>{
              handleContentStatusUpdate()
          }, [handleContentStatusUpdate])
          
  return(
    <View className='relative'>
         {loading && <View className='absolute z-10'>
            <Placeholder style={styles.image} />
          </View>}
    <TouchableOpacity onPress={() => handleContentClick(lib, contentIsPaid)} activeOpacity={0.6} key={lib._id}>
                  <AppImage 
                  source={{
                    uri: 'coverPhoto' in lib ? lib.coverPhoto :lib.portraitPhoto,
                    priority:FastImage.priority.high,
                  }} 
                  onLoadEnd={() => setLoading(false)}
                  style={styles.image} />
      </TouchableOpacity>
      </View>
  )
}

const styles = StyleSheet.create({
  blur: {
    width: '100%',
    height: 83,
  },
  input: {
    fontFamily: fonts.MANROPE_400,
    fontSize: Size.calcHeight(15),
    color: colors.GREY_WHITE,
    textAlign: 'center',
    flex: 1,
  },
  image: {
    width: Size.getWidth() / 3 - 20,
    height: 133,
    borderRadius: 15,
  },
  centerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Size.calcHeight(10),
    rowGap: Size.calcHeight(10),
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  adCard: {
    marginTop: 24,
  },
});
