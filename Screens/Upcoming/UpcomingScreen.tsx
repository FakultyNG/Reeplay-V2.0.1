import {Alert, Animated, Platform, ScrollView, StatusBar} from 'react-native';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AppScreen, AppText, AppView} from '@/components';
import colors from '@/configs/colors';
import UpcomingView from './components/UpcomingView';
import Orientation, {PORTRAIT} from 'react-native-orientation-locker';
import {getUpcomingEvents} from '@/api/upcomingEvents.api';
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
  const [pagination] = useState<IPagination>({page: 1, limit: 20});
  const [isFullscreenContent, setFullscreenContent] =
    useState<IDownloadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useAppDispatch();

  async function handleUpcomingEvents() {
    try {
      setIsLoading(true);
      const res = await getUpcomingEvents(pagination);
      if (res.ok && res.data) {
        const data: (IVODContent | ILiveContent)[] = [
          ...res.data.data.lives,
          ...res.data.data.vods,
        ];

        const sortedData = data.sort((a, b) => {
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
        Alert.alert(`${res.data?.message}`);
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
            <AppView style={{flex: 1}}>
              {isLoading || upcomingEvents.length === 0 ? (
                <LiveEmptyState
                  loading={isLoading}
                  icon={<FUpcomingIcon width={36} height={36} />}
                  title="Nothing coming soon"
                  message="New titles and events will show up here when they are scheduled. Check back later."
                />
              ) : (
                <ScrollView
                  onScroll={Animated.event(
                    [{nativeEvent: {contentOffset: {y: scrollY}}}],
                    {useNativeDriver: false},
                  )}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingBottom: Size.hp(24),
                  }}>
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
                </ScrollView>
              )}
            </AppView>
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
