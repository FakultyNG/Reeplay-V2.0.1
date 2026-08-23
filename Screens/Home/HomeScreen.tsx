import {
  Animated as Ani,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {useCallback, useRef, useState} from 'react';
import Header from './Header';
import Slider from './components/SliderContainer';
import colors from '@/configs/colors';
import {AppView} from '@/components';
import SwiperContainer from './components/SwiperContainer';
import SectionHeader from './components/SectionHeader';
import Size from '@/Utils/useResponsiveSize';
import Sections from './components/Sections';
import {useNavigation} from '@react-navigation/native';
import routes from '@/navigation/routes';
import {PORTRAIT} from 'react-native-orientation-locker';
import {useAppSelector} from '@/Hooks/reduxHook';
import {
  selectBannerContent,
  selectContinueWatching,
} from '@/store/slices/bannerSlice.slice';
import {TabNavParams} from '@/navigation/TabNavigation';
import {OrientationInjectedProps} from '@/components/OrientationWrapper';
import DownloadFullscreenModalPlayer from '../Download/FullscreenModalPlayer';
import {
  IDownloadData,
  ILiveContent,
  IVODContent,
} from '@/types/api/content.types';
import FeaturedExtras, {
  FeaturedExtrasAvailability,
} from './components/FeaturedExtras';
import HomeContinueRow from './components/HomeContinueRow';
import {useHomeBootstrap} from './hooks/useHomeBootstrap';
import {useTabBarCompactOnScroll} from '@/navigation/useTabBarCompactOnScroll';

const HomeScreen = ({
  isFullscreen,
  makeFullscreen,
  makePortrait,
}: OrientationInjectedProps) => {
  const scrollY = useRef(new Ani.Value(0)).current;
  const {reportScrollOffset} = useTabBarCompactOnScroll();
  const reportScrollOffsetRef = useRef(reportScrollOffset);
  reportScrollOffsetRef.current = reportScrollOffset;
  const {navigate} = useNavigation<TabNavParams>();
  const vods = useAppSelector(selectBannerContent).vods ?? [];
  const continueWatching = useAppSelector(selectContinueWatching) ?? [];
  const [isFullscreenContent, setFullscreenContent] =
    useState<IDownloadData | null>(null);
  const [activeFeatured, setActiveFeatured] = useState<IVODContent | null>(
    null,
  );
  const [extrasAvailable, setExtrasAvailable] =
    useState<FeaturedExtrasAvailability>(null);

  const {orientation, isRefreshing, deferHeavyRows, handleRefresh} =
    useHomeBootstrap(isFullscreen);

  const handleActiveFeaturedChange = useCallback(
    (item: IVODContent | ILiveContent | null) => {
      if (item && 'adminId' in item) {
        setActiveFeatured(prev => (prev?._id === item._id ? prev : item));
        return;
      }
      setActiveFeatured(null);
      setExtrasAvailable(false);
    },
    [],
  );

  const showContinueAfterHero = extrasAvailable === false;
  const showContinueAfterGenres = extrasAvailable === true;

  const onScroll = useRef(
    Ani.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
      useNativeDriver: true,
      listener: (event: {nativeEvent: {contentOffset?: {y?: number}}}) => {
        reportScrollOffsetRef.current(event.nativeEvent.contentOffset?.y ?? 0);
      },
    }),
  ).current;

  return (
    <>
      {!isFullscreen && orientation === PORTRAIT && (
        <>
          <Header scrollY={scrollY} />

          <StatusBar
            hidden={isFullscreen || isFullscreenContent !== null}
            translucent
            barStyle="light-content"
            backgroundColor="transparent"
          />

          <Ani.ScrollView
            scrollEnabled
            onScroll={onScroll}
            scrollEventThrottle={16}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
            contentContainerStyle={{paddingBottom: Size.hp(17), width: '100%'}}
            style={{
              backgroundColor: colors.DEEP_BLACK,
              position: 'relative',
            }}>
            <Slider
              data={vods}
              makeFullscreen={makeFullscreen}
              setFullscreenContent={setFullscreenContent}
              onActiveItemChange={handleActiveFeaturedChange}
            />

            <FeaturedExtras
              vod={activeFeatured}
              featuredVods={vods}
              onAvailabilityChange={setExtrasAvailable}
            />

            {showContinueAfterHero && (
              <HomeContinueRow
                makeFullscreen={makeFullscreen}
                setFullscreenContent={setFullscreenContent}
              />
            )}

            <AppView className="mt-8">
              <AppView className="pl-5">
                <SectionHeader
                  title="Genres"
                  btnText="SEE ALL"
                  headerStyle={{marginRight: 12}}
                  onPress={() => navigate(routes.LIBRARY_SCREEN)}
                />
              </AppView>
              <SwiperContainer />
            </AppView>

            {showContinueAfterGenres && (
              <HomeContinueRow
                afterGenres
                makeFullscreen={makeFullscreen}
                setFullscreenContent={setFullscreenContent}
              />
            )}

            <Sections
              isSkipped={continueWatching.length > 0}
              deferHeavy={deferHeavyRows}
            />
          </Ani.ScrollView>
        </>
      )}

      {isFullscreenContent && isFullscreen && (
        <DownloadFullscreenModalPlayer
          isFullscreen={isFullscreen}
          content={isFullscreenContent}
          setFullscreen={() =>
            isFullscreen
              ? [makePortrait(), setFullscreenContent(null)]
              : makeFullscreen()
          }
        />
      )}
    </>
  );
};

export default HomeScreen;
export {
  AnimatedLin,
  AnimatedView,
  SeriesVideo,
  MusicVideo,
  MovieVideo,
} from './homeShared';
