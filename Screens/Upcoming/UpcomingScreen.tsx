import {
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AppScreen, AppText} from '@/components';
import colors from '@/configs/colors';
import UpcomingView from './components/UpcomingView';
import Orientation, {PORTRAIT} from 'react-native-orientation-locker';
import {
  getLegacyUpcomingEvents,
  getUpcomingEvents,
} from '@/api/upcomingEvents.api';
import {IPagination} from '@/types/api/auth.types';
import {
  IDownloadData,
  ILiveContent,
  IVODContent,
} from '@/types/api/content.types';
import {OrientationInjectedProps} from '@/components/OrientationWrapper';
import {setOrientations} from '@/store/slices/orientationSlize';
import {setHideTabBar} from '@/store/slices/userSlice';
import {useAppDispatch} from '@/Hooks/reduxHook';
import DownloadFullscreenModalPlayer from '../Download/FullscreenModalPlayer';
import LiveEmptyState from '../Live/components/LiveEmptyState';
import {FUpcomingIcon} from '@/assets/icons';
import Size from '@/Utils/useResponsiveSize';
import {useTabBarCompactOnScroll} from '@/navigation/useTabBarCompactOnScroll';

const UpcomingScreen = ({
  isFullscreen,
  makeFullscreen,
  makePortrait,
}: OrientationInjectedProps) => {
  const [playingIndexes, setPlayingIndexes] = useState<number[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const {reportScrollOffset} = useTabBarCompactOnScroll();
  const [orientation, setOrientation] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<
    (IVODContent | ILiveContent)[]
  >([]);
  const [pagination] = useState<IPagination>({page: 1, limit: 100});
  const [isFullscreenContent, setFullscreenContent] =
    useState<IDownloadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useAppDispatch();

  async function handleUpcomingEvents() {
    try {
      setIsLoading(true);
      const results = await Promise.allSettled([
        getUpcomingEvents(pagination),
        getLegacyUpcomingEvents(pagination),
      ]);
      const responses = results
        .flatMap(result =>
          result.status === 'fulfilled' ? [result.value] : [],
        )
        .filter(response => response.ok && response.data?.data);

      if (responses.length > 0) {
        const merged = responses.flatMap(response => [
          ...(response.data?.data.lives ?? []),
          ...(response.data?.data.vods ?? []),
        ]);
        const unique = Array.from(
          new Map(
            merged.map(item => [
              `${'start' in item ? 'live' : 'vod'}:${item._id}`,
              item,
            ]),
          ).values(),
        );

        const sortedData = unique.sort((a, b) => {
          let dateA: Date;
          let dateB: Date;

          if ('releaseDate' in a) {
            dateA = new Date(a.releaseDate);
          } else {
            dateA = new Date(a.start);
          }

          if ('releaseDate' in b) {
            dateB = new Date(b.releaseDate);
          } else {
            dateB = new Date(b.start);
          }

          return dateA.getTime() - dateB.getTime();
        });

        setUpcomingEvents(sortedData);
      } else {
        Alert.alert(
          'Unable to load upcoming titles',
          'Please pull down to try again.',
        );
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }

  useLayoutEffect(() => {
    handleUpcomingEvents();
  }, []);

  function checkOrientation() {
    Orientation.getOrientation(orient => {
      if (orientation !== orient) dispatch(setOrientations(orient));

      if (orient !== PORTRAIT) {
        Orientation.lockToPortrait();
        checkOrientation();
      } else {
        setOrientation(orient);
      }
    });
  }

  useEffect(() => {
    checkOrientation();
  }, []);

  useEffect(() => {
    dispatch(setHideTabBar(isFullscreen));
  }, [isFullscreen]);

  useEffect(() => {
    const id = scrollY.addListener(({value}) => {
      reportScrollOffset(value);
    });
    return () => {
      scrollY.removeListener(id);
    };
  }, [scrollY, reportScrollOffset]);

  return (
    <>
      {!isFullscreen && orientation === PORTRAIT && (
        <>
          <StatusBar
            hidden={isFullscreen || isFullscreenContent !== null}
          />

          <AppScreen
            containerStyle={{
              backgroundColor: colors.DEEP_BLACK,
              paddingHorizontal: 0,
              paddingBottom: Platform.OS === 'ios' ? 120 : 80,
            }}>
            <AppText className="pl-5 font-LEXEND_700 text-[17px] text-grey_100 my-4">
              COMING SOON
            </AppText>
            <ScrollView
              onScroll={Animated.event(
                [{nativeEvent: {contentOffset: {y: scrollY}}}],
                {useNativeDriver: false},
              )}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              alwaysBounceVertical
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={handleUpcomingEvents}
                  tintColor={colors.RED}
                  colors={[colors.RED]}
                />
              }
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: Size.hp(24),
              }}>
              {isLoading || upcomingEvents.length === 0 ? (
                <LiveEmptyState
                  loading={isLoading}
                  icon={<FUpcomingIcon width={36} height={36} />}
                  title="Nothing coming soon"
                  message="New titles and events will show up here when they are scheduled. Check back later."
                />
              ) : (
                <>
                  {upcomingEvents.map((item, i) => {
                    return (
                      <UpcomingView
                        key={i}
                        items={item}
                        index={i}
                        scrollY={scrollY}
                        playingIndexes={playingIndexes}
                        setPlayingIndexes={setPlayingIndexes}
                        setFullscreenContent={setFullscreenContent}
                        makeFullscreen={makeFullscreen}
                      />
                    );
                  })}
                </>
              )}
            </ScrollView>
          </AppScreen>
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

export default UpcomingScreen;
