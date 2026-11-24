import {
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import colors from '@/configs/colors';
import LinearGradient from 'react-native-linear-gradient';
import {AppView} from '@/components';
import Size from '@/Utils/useResponsiveSize';
import Caurosel from './Caurosel';
import Carousel from 'react-native-reanimated-carousel';
import {
  IDownloadData,
  ILiveContent,
  IVODContent,
} from '@/types/api/content.types';
import {generateGradientColors} from '@/Utils/contentUtils';
import LiveEmptyState from '@/Screens/Live/components/LiveEmptyState';
import {FHomeIcon} from '@/assets/icons';
import {queueAnalyticsEvent} from '@/api/analytics.api';

const SLIDER_HEIGHT =
  Platform.OS === 'ios' ? Size.getHeight() * 0.59 : Size.getHeight() * 0.62;
const WIDTH = Dimensions.get('window').width;
const INDICATOR_ACTIVE_WIDTH = 23;
const INDICATOR_INACTIVE_WIDTH = 6;
const INDICATOR_HEIGHT = 3;

const gradientCache = new Map<string, string[]>();

function cachedGradient(primaryColor: string) {
  const key = primaryColor || '#333333';
  const hit = gradientCache.get(key);
  if (hit) {
    return hit;
  }
  const next = generateGradientColors(key);
  gradientCache.set(key, next);
  return next;
}

interface SliderProps {
  data: (IVODContent | ILiveContent)[];
  live?: boolean;
  makeFullscreen?: () => void;
  setFullscreenContent?: React.Dispatch<
    React.SetStateAction<IDownloadData | null>
  >;
}

function normalizeCarouselIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }
  return ((Math.round(index) % length) + length) % length;
}

function itemPrimaryColor(item: IVODContent | ILiveContent | undefined) {
  if (item && 'primaryColor' in item && item.primaryColor) {
    return item.primaryColor;
  }
  return '#333333';
}

type ChromeState = {index: number; primaryColor: string};

const Slider = ({
  data,
  live,
  makeFullscreen,
  setFullscreenContent,
}: SliderProps) => {
  const initialColor = itemPrimaryColor(data[0]);
  const [chrome, setChrome] = useState<ChromeState>({
    index: 0,
    primaryColor: initialColor,
  });
  const [committedIndex, setCommittedIndex] = useState(0);

  const showHeroEmpty = data.length === 0;
  const dataRef = useRef(data);
  const seenContent = useRef(new Set<string>());
  dataRef.current = data;

  const updateChrome = useCallback((index: number) => {
    const list = dataRef.current;
    const next = normalizeCarouselIndex(index, list.length);
    const primaryColor = itemPrimaryColor(list[next]);
    setChrome(prev =>
      prev.index === next && prev.primaryColor === primaryColor
        ? prev
        : {index: next, primaryColor},
    );
    return next;
  }, []);

  const commitExtras = useCallback((index: number) => {
    const next = updateChrome(index);
    setCommittedIndex(prev => (prev === next ? prev : next));
    const item = dataRef.current[next];
    if (item && !seenContent.current.has(item._id)) {
      seenContent.current.add(item._id);
      queueAnalyticsEvent({
        eventType: 'content_impression',
        contentId: item._id,
        contentType: 'adminId' in item ? 'vod' : 'live',
        sourceScreen: live ? 'Live' : 'Home',
      });
    }
  }, [live, updateChrome]);

  useEffect(() => {
    if (data.length > 0) {
      commitExtras(0);
    } else {
      setChrome({index: 0, primaryColor: '#333333'});
      setCommittedIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length]);

  return (
    <AppView className="relative w-full">
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.65)', 'transparent']}
        style={styles.gradientStyles}
      />

      {!live && data.length > 0 && (
        <BackDrop primaryColor={chrome.primaryColor} />
      )}

      <View
        style={{
          height:
            data.length > 0 || showHeroEmpty ? 510 : Size.calcHeight(120),
        }}>
        {data.length > 0 ? (
          <HeroCarousel
            data={data}
            live={live}
            committedIndex={committedIndex}
            makeFullscreen={makeFullscreen}
            setFullscreenContent={setFullscreenContent}
            onProgressIndex={updateChrome}
            onSnapIndex={commitExtras}
          />
        ) : showHeroEmpty ? (
          <LiveEmptyState
            variant="hero"
            compact={live}
            icon={live ? undefined : <FHomeIcon width={42} height={24} />}
            title={
              live ? 'No Live content' : 'No featured titles'
            }
            message={
              live
                ? undefined
                : 'Featured movies and shows will appear here when they are available.'
            }
          />
        ) : null}
      </View>
      {data.length > 0 && (
        <Indicators items={data} currentIndex={chrome.index} />
      )}
    </AppView>
  );
};

interface HeroCarouselProps {
  data: (IVODContent | ILiveContent)[];
  live?: boolean;
  committedIndex: number;
  makeFullscreen?: () => void;
  setFullscreenContent?: React.Dispatch<
    React.SetStateAction<IDownloadData | null>
  >;
  onProgressIndex: (index: number) => void;
  onSnapIndex: (index: number) => void;
}

/** Isolated so backdrop chrome updates do not re-render every slide. */
const HeroCarousel = memo(function HeroCarousel({
  data,
  live,
  committedIndex,
  makeFullscreen,
  setFullscreenContent,
  onProgressIndex,
  onSnapIndex,
}: HeroCarouselProps) {
  const progressRef = useRef(onProgressIndex);
  const snapRef = useRef(onSnapIndex);
  progressRef.current = onProgressIndex;
  snapRef.current = onSnapIndex;

  return (
    <Carousel
      loop
      style={{
        width: WIDTH,
        marginTop: 102,
      }}
      vertical={false}
      width={WIDTH}
      height={410}
      pagingEnabled
      modeConfig={{
        parallaxScrollingScale: 0.9,
        parallaxScrollingOffset: 80,
      }}
      mode="parallax"
      snapEnabled
      data={data}
      scrollAnimationDuration={220}
      onSnapToItem={index => snapRef.current(index)}
      onProgressChange={(_, absoluteProgress) => {
        progressRef.current(absoluteProgress);
      }}
      renderItem={({item, index}) => {
        if (!item) {
          return <View />;
        }
        return (
          <Caurosel
            item={item}
            currentIndex={index === committedIndex}
            colors={
              live
                ? ['transparent', 'rgba(0,0,0,0.8)', '#000']
                : [
                    'transparent',
                    'rgba(0,0,0,0.45)',
                    'rgba(0,0,0,0.92)',
                    '#000000',
                  ]
            }
            live={live}
            watchLive={makeFullscreen}
            handleVODTrailer={() =>
              'adminId' in item && setFullscreenContent
                ? setFullscreenContent({
                    _id: item._id,
                    desc: item.description,
                    landscapePhoto: item.landscapePhoto,
                    pg: item.pg,
                    portraitPhoto: item.portraitPhoto,
                    title: item.title,
                    video: item.trailer,
                    size: '30',
                    type: item.type,
                    viewsCount: item.viewsCount,
                    vidClass: item.vidClass,
                    playbackRole: 'trailer',
                  })
                : console.log('')
            }
          />
        );
      }}
    />
  );
});

interface BackDropOptions {
  primaryColor: string;
}

const BackDrop = memo(function BackDrop({primaryColor}: BackDropOptions) {
  const gradientColors = useMemo(
    () => cachedGradient(primaryColor || '#333333'),
    [primaryColor],
  );

  return (
    <AppView
      style={{
        zIndex: -1,
        height: SLIDER_HEIGHT + 30,
      }}
      className="w-full absolute overflow-hidden">
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFillObject}
      />
    </AppView>
  );
});

interface indicatorData {
  items: any[];
  currentIndex: number;
}

const Indicators = memo(function Indicators({
  items,
  currentIndex,
}: indicatorData) {
  const windowStart =
    currentIndex % 3 === 0
      ? currentIndex
      : Math.floor(currentIndex / 3) * 3;

  return (
    <AppView
      className="flex-row items-center justify-center gap-x-[3px]"
      style={{height: INDICATOR_HEIGHT, overflow: 'hidden'}}>
      {items.map((item, i) => {
        if (!item || item.title === 'spacer') {
          return null;
        }

        const activeArray = [windowStart, windowStart + 1, windowStart + 2];
        const isNearActive = activeArray.includes(i);
        const isMain = currentIndex === i;

        return (
          <View
            key={item._id ?? i}
            style={{
              width: isNearActive
                ? INDICATOR_ACTIVE_WIDTH
                : INDICATOR_INACTIVE_WIDTH,
              height: INDICATOR_HEIGHT,
              borderRadius: 10,
              backgroundColor: isMain ? colors.RED : 'rgba(255, 19, 19, 0.4)',
            }}
          />
        );
      })}
    </AppView>
  );
});

export default Slider;

const styles = StyleSheet.create({
  gradientStyles: {
    width: '100%',
    height: Size.calcHeight(130),
    zIndex: 1,
    position: 'absolute',
  },
});
