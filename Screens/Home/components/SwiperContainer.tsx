import {
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';
import {AppImage, AppText, AppView, TouchableOpacity} from '@/components';
import SwiperFlatList from 'react-native-swiper-flatlist';
import fonts from '@/configs/fonts';
import {MotiView} from 'moti';
import colors from '@/configs/colors';
import {Easing} from 'react-native-reanimated';
import Size from '@/Utils/useResponsiveSize';
import routes from '@/navigation/routes';
import {previewContentType, RootNav} from '@/navigation/AppNavigator';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {selectGenres} from '@/store/slices/bannerSlice.slice';
import {ICategoryData, IVODContent} from '@/types/api/content.types';
import {getDefaultLibrary, getVODbyGenreID} from '@/api/content.api';
import Placeholder from '@/components/SkeletonLoader';
import FastImage from 'react-native-fast-image';
import {setPreviewContent} from '@/store/slices/previewContentSlice';
import {getVodRowCache, setVodRowCache} from '@/Utils/contentMmkv';
import LiveEmptyState from '@/Screens/Live/components/LiveEmptyState';
import {FHomeIcon} from '@/assets/icons';

const ALL_TAB_ID = '__all__';
const ALL_TAB: ICategoryData = {
  _id: ALL_TAB_ID,
  name: 'All',
  createdAt: '',
  updatedAt: '',
  position: -1,
};
const HOME_GENRE_LIMIT = 9;

const SwiperContainer = () => {
  const genres = useAppSelector(selectGenres) ?? [];
  const tabs = useMemo(() => [ALL_TAB, ...genres], [genres]);
  const {navigate} = useNavigation<RootNav>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [contents, setContents] = useState<Record<string, IVODContent[]>>({});
  const dispatch = useAppDispatch();

  async function fetchTab(tab: ICategoryData) {
    if (!tab) {
      return;
    }
    const cacheKey =
      tab._id === ALL_TAB_ID ? 'library.default' : `genre.${tab._id}`;
    const cached = getVodRowCache(cacheKey);
    if (cached?.length) {
      setContents(prev => ({...prev, [tab.name]: cached}));
    }

    const res =
      tab._id === ALL_TAB_ID
        ? await getDefaultLibrary({
            pagination: {page: 1, limit: HOME_GENRE_LIMIT},
          })
        : await getVODbyGenreID({
            enumId: tab._id,
            pagination: {page: 1, limit: HOME_GENRE_LIMIT},
          });

    if (res.ok && res.data) {
      const data = (res.data.data ?? []).slice(0, HOME_GENRE_LIMIT);
      setContents(prev => ({...prev, [tab.name]: data}));
      setVodRowCache(cacheKey, data);
    } else if (!cached?.length) {
      setContents(prev => ({...prev, [tab.name]: []}));
    }
  }

  function handleTab(tabName: string, index: number) {
    setActiveIndex(index);
    const tab = tabs[index];
    if (tab && !(tabName in contents)) {
      fetchTab(tab);
    }
  }

  useEffect(() => {
    if (!tabs.length) {
      return;
    }
    // Default to All (same default-library source as Library).
    fetchTab(tabs[0]);
  }, [genres]);

  if (genres.length === 0) {
    return (
      <LiveEmptyState
        icon={<FHomeIcon width={36} height={20} />}
        title="No genres yet"
        message="Browse by genre will appear here when titles are available. Check back later."
      />
    );
  }

  const activeTab = tabs[activeIndex];
  const activeGenreName = activeTab?.name;
  const genreItems = activeGenreName ? contents[activeGenreName] : undefined;
  const genreLoaded = activeGenreName != null && activeGenreName in contents;
  const showGenreEmpty = genreLoaded && (genreItems?.length ?? 0) === 0;

  return (
    <AppView style={styles.container}>
      <AppView
        style={{width: Size.getWidth(), overflow: 'hidden'}}
        className="pl-5">
        <FlatList
          data={tabs}
          keyExtractor={item => item._id || item.name}
          horizontal
          showsHorizontalScrollIndicator={false}
          removeClippedSubviews={true}
          contentContainerStyle={{
            marginTop: 15,
          }}
          renderItem={({item, index}) => {
            const show = activeIndex === index;
            return (
              <Pressable
                style={{marginHorizontal: 6}}
                onPress={() => handleTab(item.name, index)}>
                <AppText
                  style={show && {fontFamily: fonts.MANROPE_700}}
                  className="text-center font-MANROPE_400 text-[12px] text-white capitalize px-4">
                  {item.name}
                </AppText>
                <MotiView
                  style={styles.bar}
                  from={{transform: [{scaleX: 0}]}}
                  animate={{transform: [{scaleX: show ? 1 : 0}]}}
                  transition={{
                    type: 'timing',
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                  }}
                />
              </Pressable>
            );
          }}
        />
      </AppView>

      {showGenreEmpty ? (
        <LiveEmptyState
          icon={<FHomeIcon width={36} height={20} />}
          title={`No ${activeGenreName} titles`}
          message="Titles in this genre will appear here when they are available. Check back later."
        />
      ) : (
        <AppView>
          <SwiperFlatList
            showPagination={true}
            paginationActiveColor={colors.RED}
            paginationDefaultColor="rgba(255, 19, 19, 0.4)"
            paginationStyleItem={styles.pagination}
            removeClippedSubviews={true}
            data={
              (genreItems?.length ?? 0) > 0 ? genreItems! : [...Array(1)]
            }
            renderItem={({item, index}) => (
              <>
                {(genreItems?.length ?? 0) > 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (!item?._id) {
                        return;
                      }
                      dispatch(setPreviewContent(item));
                      navigate(routes.PREVIEW_SCREEN, {
                        content: previewContentType.film,
                        videoURL: item.trailer ?? '',
                      });
                    }}>
                    <AppImage
                      key={index}
                      style={styles.image}
                      source={{
                        uri: item.portraitPhoto,
                        priority: FastImage.priority.high,
                        cache: FastImage.cacheControl.immutable,
                      }}
                    />
                  </TouchableOpacity>
                ) : (
                  <Placeholder style={styles.image} noAnimate />
                )}
              </>
            )}
          />
        </AppView>
      )}
    </AppView>
  );
};

export default SwiperContainer;

const styles = StyleSheet.create({
  container: {
    paddingBottom: Size.calcHeight(18),
  },
  bar: {
    width: '100%',
    backgroundColor: colors.RED,
    height: 1.5,
    marginTop: 4,
    transformOrigin: 'center',
  },
  pagination: {
    width: Size.calcAverage(23),
    height: Size.calcAverage(3),
    marginHorizontal: Size.calcWidth(3),
    marginTop: Size.calcHeight(52),
  },
  image: {
    width: Size.getWidth() - 32,
    height: Size.calcHeight(240),
    marginTop: Size.calcHeight(20),
    borderRadius: 15,
    marginHorizontal: 16,
  },
});
