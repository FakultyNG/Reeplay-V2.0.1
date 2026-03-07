import {ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {
  AppHeader,
  AppImage,
  AppScreen,
  AppText,
  AppView,
  TouchableOpacity,
} from '@/components';
import Size from '@/Utils/useResponsiveSize';
import {LibraryData} from '@/configs/data';
import AppModal from '@/components/AppModal';
import {CloseLogo} from '@/assets/icons';
import {useNavigation} from '@react-navigation/native';
import {WatchlistScreenNav} from '@/types/typings';
import routes from '@/navigation/routes';
import {previewContentType, RootNav} from '@/navigation/AppNavigator';
import {MovieVideo} from '../Home/HomeScreen';
import FastImage from 'react-native-fast-image';
import Placeholder from '@/components/SkeletonLoader';
import { IVODContent } from '@/types/api/content.types';
import ToastNotification from '@/components/ToastNotifications';
import { fetchWatchList, removeWatchList } from '@/api/watchlist.api';
import { useAppDispatch, useAppSelector } from '@/Hooks/reduxHook';
import { deleteWatchlistById, selectWatchListContents, setWatchListContents } from '@/store/slices/userSlice';
import {BlurView as Blur} from '@react-native-community/blur';
import DeleteIcon from '@/assets/icons/Waste Basket icon.svg'
import Animated, { FadeInDown } from 'react-native-reanimated';
import colors from '@/configs/colors';
import { setPreviewContent } from '@/store/slices/previewContentSlice';

interface WatchListData {
  image: string;
}

const WatchlistScreen = () => {
  const {goBack, navigate} = useNavigation<WatchlistScreenNav>();
  const watchList = useAppSelector(selectWatchListContents);
  const [loading, setLoading] = useState<boolean>(true);
    const [loading_m, setLoading_m] = useState<boolean>(false);
    const [loading_d, setLoading_d] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [selectedContent, setSelectContent] = useState<IVODContent|null>(null)
    const dispatch = useAppDispatch()

    async function deleteWatchList(){
      if(!selectedContent) return;
      try {
        setLoading_d(true);
        const res = await removeWatchList(selectedContent._id);
        if(res.ok && res.data){
                  ToastNotification('info', res.data.message);
                  dispatch(deleteWatchlistById(selectedContent._id));
                  setSelectContent(null);
                }else{
          ToastNotification('error', res.data?.message);
        }
      } catch (error) {
        ToastNotification('error', `${error}`);
      }finally{
        setSelectContent(null);
        setLoading_d(false)
      }
    }

    async function handleFetchList(page?:number, isLoadMore?:boolean){
    if(loading_m || !hasMore) return
    try {
      if(isLoadMore){
        setLoading_m(true)
         }else{
        setLoading(true);
      }

        const res = await fetchWatchList({page:page??1, limit:20});
        if(res.ok && res.data){
          const data = res.data.data
          const existingIds = new Set<string>(watchList.map((x) => x._id))
          const merged = [
            ...watchList,
            ...data.filter(x => !existingIds.has(x._id))
          ]
          if(watchList.length === merged.length) setHasMore(false)
            dispatch(setWatchListContents(merged));
          if(page) setPage(page);
        }else{
          ToastNotification('error', `${res.data?.message}`)
          setHasMore(false)
        }
      } catch (error) {
        setHasMore(false);
        ToastNotification('error', `${error}`);
      }finally{
      if(isLoadMore){
        setLoading_m(false)
      }else{
        setLoading(false);
      }
    }
    }

      const loadMore = () => {
        if(!hasMore || watchList.length < 20) return;
        handleFetchList(watchList.length >= page * 20 ? page+1:page, true)
      }
    
      useEffect(() =>{
        handleFetchList(page);
      }, [])
    
      useEffect(() =>{
        if(watchList.length>20)
        if(!hasMore) setTimeout(()=> setHasMore(true), 3000);
      }, [hasMore])

      // console.log(loading)

  return (
    <AppScreen containerStyle={{paddingTop: 10}}>
      <AppHeader style={{zIndex: 99}} />
      {(watchList.length === 0 && !loading)? (
        <AppModal
          isModalVisible={true}
          hideLoge
          replaceDefaultContent={
            <AppView className="mb-[74px] mt-14 items-center">
              <CloseLogo />
              <AppText className="mt-5 leading-5 font-ROBOTO_400 text-[14px] text-black text-center">
                Your watchlist is empty.{'\n'} You haven't added any content to
                your watchlist yet.
              </AppText>
            </AppView>
          }
          handleClose={goBack}
        />
      ) : (
        <>
        {selectedContent !== null &&  <Animated.View entering={FadeInDown.springify()} className='absolute bottom-10 w-full h-20 z-50'><TouchableOpacity onPress={deleteWatchList} className='mb-5 mx-auto w-20 h-20 rounded-full bg-white justify-center items-center'>
          {loading_d ? <ActivityIndicator size={'small'} color={colors.RED} /> : <DeleteIcon width={26} height={26} />}
          </TouchableOpacity></Animated.View>}
          <AppText className="text-center font-LEXEND_700 text-grey_100 -mt-5 text-[17px]">
            My Watchlist
          </AppText>

           <AppView className="relative">
            {selectedContent !== null && <Pressable onPress={() => setSelectContent(null)} className='absolute w-full h-full z-40'>
               <Blur
              style={{width: '100%', height: '100%'}}
              blurType="dark"
              blurAmount={2}
            />
            </Pressable>}

                   <FlatList
                     data={loading ? [...Array(20)] : watchList}
                     keyExtractor={(item,index) => loading ? index.toString() : item._id}
                     showsVerticalScrollIndicator={false}
                     contentContainerStyle={styles.centerContent}
                     onEndReachedThreshold={1}
                    onEndReached={loadMore}
                 ListFooterComponent={
                   <>
                     {loading_m && (
                       <AppView className="h-20 items-center justify-center">
                         <ActivityIndicator size={'large'} />
                       </AppView>
                     )}
                   </>
                 }
                     renderItem={({item,index}) =>{
                       if(loading) return <Placeholder style={styles.image} />
                       return <ContentItem key={index} item={item} handleLongPress={() => setSelectContent(item)} />
                     }}
                   />
                 </AppView>
        </>
      )}
    </AppScreen>
  );
};

export default WatchlistScreen;

export const ContentItem = ({item, handleLongPress}:{item:IVODContent, handleLongPress: () => void}) =>{
    const {navigate} = useNavigation<RootNav>();
    const [loading, setLoading] = useState<boolean>(true)
    const dispatch = useAppDispatch()
   
   useEffect(() => {
     function preloadMedia() {
      try {
        let uri = item.portraitPhoto;

        if (uri) FastImage.preload([{ uri }]);
      } catch (err) {
        console.log('Error preloading media:', err);
      } finally {
        setLoading(false);
      }
    }
      preloadMedia();
  }, [item._id]);

  return (
    <View className='relative'>
     {loading && <View className='absolute z-10'>
        <Placeholder style={styles.image} />
      </View>}
    <TouchableOpacity
      activeOpacity={0.6}
      onLongPress={handleLongPress}
      onPress={() =>
       [dispatch(setPreviewContent(item)), navigate(routes.PREVIEW_SCREEN, {
          content: item.type.includes('series') ? previewContentType['tv series'] : item.type.includes('video') ? previewContentType['music video'] : previewContentType.film,
          videoURL: item.trailer,
        })]
      }>
        <AppImage 
          source={{
            uri: item.portraitPhoto,
            priority:FastImage.priority.high
          }} 
          style={styles.image}
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
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
    rowGap: Size.calcHeight(13),
    paddingBottom: 20,
    marginTop: 20,
  },
});
