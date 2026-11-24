import {RefreshControl, ScrollView, StatusBar} from 'react-native';
import {useCallback, useRef, useState} from 'react';
import {useSharedValue} from 'react-native-reanimated';
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
import {selectBannerContent, selectContinueWatching} from '@/store/slices/bannerSlice.slice';
import {TabNavParams} from '@/navigation/TabNavigation';
import {OrientationInjectedProps} from '@/components/OrientationWrapper';
import DownloadFullscreenModalPlayer from '../Download/FullscreenModalPlayer';
import {IDownloadData} from '@/types/api/content.types';
import HomeContinueRow from './components/HomeContinueRow';
import {useHomeBootstrap} from './hooks/useHomeBootstrap';
import {useTabBarCompactOnScroll} from '@/navigation/useTabBarCompactOnScroll';

const HomeScreen = ({
  isFullscreen,
  makeFullscreen,
  makePortrait,
}: OrientationInjectedProps) => {
  const headerScrollY = useSharedValue(0);
  const {reportScrollOffset} = useTabBarCompactOnScroll();
  const reportScrollOffsetRef = useRef(reportScrollOffset);
  reportScrollOffsetRef.current = reportScrollOffset;
  const {navigate} = useNavigation<TabNavParams>();
  const vods = useAppSelector(selectBannerContent).vods ?? [];
  const continueWatching = useAppSelector(selectContinueWatching) ?? [];
  const [isFullscreenContent, setFullscreenContent] =
    useState<IDownloadData | null>(null);

  const {orientation, isRefreshing, deferHeavyRows, handleRefresh} =
    useHomeBootstrap(isFullscreen);

  const onScroll = useCallback(
    (event: {nativeEvent: {contentOffset?: {y?: number}}}) => {
      const y = event.nativeEvent.contentOffset?.y ?? 0;
      headerScrollY.value = y;
      reportScrollOffsetRef.current(y);
    },
    [headerScrollY],
  );

  return (
    <>
      {!isFullscreen && orientation === PORTRAIT && (
        <>
          <StatusBar
            hidden={isFullscreen || isFullscreenContent !== null}
            translucent
            barStyle="light-content"
            backgroundColor="transparent"
          />

          <ScrollView
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
            />

            <Sections deferHeavy={deferHeavyRows} />

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

            {continueWatching.length > 0 && (
              <HomeContinueRow
                afterGenres
                makeFullscreen={makeFullscreen}
                setFullscreenContent={setFullscreenContent}
              />
            )}

          </ScrollView>

          <Header scrollY={headerScrollY} />
        </>
      )}

      {isFullscreenContent && isFullscreen && (
        <DownloadFullscreenModalPlayer
          isFullscreen={isFullscreen}
          content={isFullscreenContent}
          minimalUi
          enableMainContentAds={isFullscreenContent.playbackRole === 'main'}
          onChangeContent={setFullscreenContent}
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
