import {
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  StatusBar,
  View,
} from 'react-native';
import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AppScreen, AppText} from '@/components';
import colors from '@/configs/colors';
import UpcomingView from './components/UpcomingView';
import Orientation, {PORTRAIT} from 'react-native-orientation-locker';
import {
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
import {getUpcomingCache, setUpcomingCache} from '@/Utils/contentMmkv';
import {useLiveFeatureStore} from '@/store/liveFeature.store';
import {isMusicVideoContent} from '@/Utils/contentVisibility';
import SurfaceAdCard from '@/components/SurfaceAdCard';

const excludeMusicVideos = (items: (IVODContent | ILiveContent)[]) =>
  items.filter(item => !('adminId' in item) || !isMusicVideoContent(item));

const UpcomingScreen = ({
  isFullscreen,
  makeFullscreen,
  makePortrait,
}: OrientationInjectedProps) => {
  const liveEnabled = useLiveFeatureStore(state => state.enabled);
  const [playingIndexes, setPlayingIndexes] = useState<number[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const {reportScrollOffset} = useTabBarCompactOnScroll();
  const [orientation, setOrientation] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<
    (IVODContent | ILiveContent)[]
  >(() =>
    excludeMusicVideos(
      getUpcomingCache().filter(item => liveEnabled || 'adminId' in item),
    ),
  );
  const [pagination] = useState<IPagination>({page: 1, limit: 100});
  const [isFullscreenContent, setFullscreenContent] =
    useState<IDownloadData | null>(null);
  const [isLoading, setIsLoading] = useState(
    () => getUpcomingCache().length === 0,
  );
  const hadUpcomingCacheOnMount = useRef(upcomingEvents.length > 0);
  const dispatch = useAppDispatch();

  const handleUpcomingEvents = useCallback(async () => {
    try {
      if (!hadUpcomingCacheOnMount.current) setIsLoading(true);
      const response = await getUpcomingEvents(pagination);

      if (response.ok && response.data?.data) {
        const merged = [
          ...(liveEnabled ? response.data.data.lives ?? [] : []),
          ...(response.data.data.vods ?? []),
        ];

        const sortedData = merged.sort((a, b) => {
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

        const nextUpcoming = excludeMusicVideos(sortedData).slice(0, 100);
        setUpcomingEvents(nextUpcoming);
        setUpcomingCache(nextUpcoming);
      } else {
        if (!hadUpcomingCacheOnMount.current) {
          Alert.alert(
            'Unable to load upcoming titles',
            'Please pull down to try again.',
          );
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }, [liveEnabled, pagination]);

  useEffect(() => {
    if (liveEnabled) return;
    setUpcomingEvents(current => {
      const vodsOnly = current.filter(item => 'adminId' in item);
      setUpcomingCache(vodsOnly);
      return vodsOnly;
    });
  }, [liveEnabled]);

  useLayoutEffect(() => {
    handleUpcomingEvents();
  }, [handleUpcomingEvents]);

  const checkOrientation = useCallback(() => {
    Orientation.getOrientation(orient => {
      if (orientation !== orient) dispatch(setOrientations(orient));

      if (orient !== PORTRAIT) {
        Orientation.lockToPortrait();
        checkOrientation();
      } else {
        setOrientation(orient);
      }
    });
  }, [dispatch, orientation]);

  useEffect(() => {
    checkOrientation();
  }, [checkOrientation]);

  useEffect(() => {
    dispatch(setHideTabBar(isFullscreen));
  }, [dispatch, isFullscreen]);

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
              <View style={styles.header}>
                <AppText style={styles.eyebrow}>DISCOVER WHAT’S NEXT</AppText>
                <View style={styles.titleRow}>
                  <AppText style={styles.title}>Coming Soon</AppText>
                  {!isLoading && upcomingEvents.length > 0 && (
                    <View style={styles.countPill}>
                      <AppText style={styles.countText}>{upcomingEvents.length}</AppText>
                    </View>
                  )}
                </View>
                <AppText style={styles.subtitle}>
                  Preview upcoming releases and add reminders for the titles you don’t want to miss.
                </AppText>
              </View>

              <SurfaceAdCard sourceScreen="Upcoming" style={styles.adCard} />

              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Upcoming releases</AppText>
                <AppText style={styles.sectionMeta}>Earliest first</AppText>
              </View>
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
                        key={`${'start' in item ? 'live' : 'vod'}:${item._id}`}
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
          minimalUi={false}
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

const styles = StyleSheet.create({
  header: {paddingHorizontal: 20, paddingTop: 18},
  eyebrow: {color: '#FF4B4F', fontFamily: 'MANROPE_700', fontSize: 10, letterSpacing: 1.4},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 5},
  title: {color: '#FFFFFF', fontFamily: 'LEXEND_700', fontSize: 27},
  countPill: {minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#26282F'},
  countText: {color: '#D9DBDF', fontFamily: 'MANROPE_700', fontSize: 11},
  subtitle: {color: '#8E929C', fontFamily: 'MANROPE_400', fontSize: 13, lineHeight: 19, marginTop: 8},
  adCard: {marginHorizontal: 20, marginTop: 22},
  sectionHeader: {paddingHorizontal: 20, marginTop: 27, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sectionTitle: {color: '#F3F3F4', fontFamily: 'MANROPE_700', fontSize: 15},
  sectionMeta: {color: '#777B85', fontFamily: 'MANROPE_500', fontSize: 11},
});
