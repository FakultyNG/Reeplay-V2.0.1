import {View, ViewStyle} from 'react-native';
import React, {useEffect, useState} from 'react';
import {ICategoryData, IVODContent} from '@/types/api/content.types';
import {getVODbyEnumID} from '@/api/content.api';
import AppCategories from './AppCategories';
import Size from '@/Utils/useResponsiveSize';
import colors from '@/configs/colors';
import {ImageStyle} from 'react-native-fast-image';
import {getVodRowCache, setVodRowCache} from '@/Utils/contentMmkv';
import {MotiView} from 'moti';
import {Easing} from 'react-native-reanimated';
import LiveEmptyState from '@/Screens/Live/components/LiveEmptyState';
import SectionHeader from '@/Screens/Home/components/SectionHeader';
import {FHomeIcon} from '@/assets/icons';

interface Props {
  enums: ICategoryData;
  showPagination?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  tag?: boolean;
  live?: boolean;
  isMusic?: boolean;
  /** When false, skip network until enabled (progressive home). */
  enabled?: boolean;
}

const DOT_COUNT = 5;
const VISIBLE_ITEMS = 3;
const MAIN_DOT_SIZE = 9;
const SECONDARY_DOT_SIZE = 7;
const INACTIVE_DOT_SIZE = 5;
const MAIN_DOT_COLOR = colors.RED;
const SECONDARY_DOT_COLOR = 'rgba(255, 19, 19, 0.7)';
const INACTIVE_DOT_COLOR = 'rgba(255, 19, 19, 0.35)';
const DOT_TRANSITION = {
  type: 'timing' as const,
  duration: 320,
  easing: Easing.out(Easing.cubic),
};

/**
 * Main travels across the strip with scroll.
 * - Start: main first, two less-active on its right
 * - Middle: main centered between the two less-active
 * - End: main last, two less-active on its left
 */
function getDotRoles(mainDot: number, count: number) {
  if (mainDot <= 0) {
    return {main: 0, secondary: new Set([1, 2])};
  }
  if (mainDot >= count - 1) {
    return {
      main: count - 1,
      secondary: new Set([count - 3, count - 2]),
    };
  }
  return {
    main: mainDot,
    secondary: new Set([mainDot - 1, mainDot + 1]),
  };
}

const ContentWrapper = ({
  enums,
  live,
  isMusic,
  showPagination,
  imageStyle,
  tag,
  style,
  enabled = true,
}: Props) => {
  const [content, setContent] = useState<IVODContent[]>(() => {
    return getVodRowCache(enums._id) ?? [];
  });
  const [loading, setLoading] = useState<boolean>(content.length === 0);
  const [currentIndex, setCurrentIndex] = useState(0);

  async function fetchVODContent() {
    try {
      if (content.length === 0) {
        setLoading(true);
      }
      const res = await getVODbyEnumID({
        enumId: enums._id,
        pagination: {page: 1, limit: 30},
      });
      if (res.ok && res.data) {
        setContent(res.data.data);
        setVodRowCache(enums._id, res.data.data);
      }
    } catch {
      // Keep cached content on failure.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const cached = getVodRowCache(enums._id);
    if (cached?.length) {
      setContent(cached);
      setLoading(false);
    }
    fetchVODContent();
  }, [enums._id, enabled]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [enums._id, content.length]);

  const maxScrollIndex = Math.max(0, content.length - VISIBLE_ITEMS);
  const progress =
    maxScrollIndex === 0
      ? 0
      : Math.min(1, Math.max(0, currentIndex / maxScrollIndex));
  const mainDot = Math.round(progress * (DOT_COUNT - 1));
  const {main, secondary} = getDotRoles(mainDot, DOT_COUNT);

  if (!loading && content.length === 0) {
    return (
      <View>
        <SectionHeader
          title={enums.name}
          btnText=""
          onPress={() => console.log('popular')}
        />
        <LiveEmptyState
          icon={<FHomeIcon width={36} height={20} />}
          title={`No ${enums.name} yet`}
          message="Titles for this section will appear here when they are available. Check back later."
        />
      </View>
    );
  }

  return (
    <>
      <AppCategories
        title={enums.name}
        movieCategories={content}
        onPress={() => console.log('popular')}
        style={style ?? {marginRight: Size.calcHeight(12)}}
        imageStyle={imageStyle}
        tag={tag}
        isLoading={loading && content.length === 0}
        video={isMusic}
        onIndexChange={showPagination ? setCurrentIndex : undefined}
      />

      {showPagination && !loading && content.length > 5 && (
        <View
          className="flex-row items-center justify-center gap-x-1.5 -mb-4 mt-4"
          style={{height: MAIN_DOT_SIZE, overflow: 'hidden'}}>
          {[...Array(DOT_COUNT)].map((_, i) => {
            const isMain = i === main;
            const isSecondary = secondary.has(i);
            const size = isMain
              ? MAIN_DOT_SIZE
              : isSecondary
                ? SECONDARY_DOT_SIZE
                : INACTIVE_DOT_SIZE;
            const color = isMain
              ? MAIN_DOT_COLOR
              : isSecondary
                ? SECONDARY_DOT_COLOR
                : INACTIVE_DOT_COLOR;
            return (
              <MotiView
                key={i}
                animate={{
                  width: size,
                  height: size,
                  backgroundColor: color,
                }}
                transition={DOT_TRANSITION}
                style={{borderRadius: 99}}
              />
            );
          })}
        </View>
      )}
    </>
  );
};

export default ContentWrapper;
