import {View, ViewStyle} from 'react-native';
import React, {useEffect, useState} from 'react';
import {ICategoryData, IVODContent} from '@/types/api/content.types';
import {getTopTenVODs, getVODbyEnumID} from '@/api/content.api';
import AppCategories from './AppCategories';
import Size from '@/Utils/useResponsiveSize';
import FastImage, {ImageStyle} from 'react-native-fast-image';
import {getVodRowCache, setVodRowCache} from '@/Utils/contentMmkv';
import InfinityPaginationDots from './InfinityPaginationDots';
import {filterCategoryVodContent} from '@/Utils/contentVisibility';

interface Props {
  enums: ICategoryData;
  showPagination?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  topTen?: boolean;
  live?: boolean;
  isMusic?: boolean;
  /** When false, skip network until enabled (progressive home). */
  enabled?: boolean;
  /** Lets Home remove the entire row when this category has no titles. */
  onContentAvailabilityChange?: (hasContent: boolean) => void;
}

const VISIBLE_ITEMS = 3;
const INITIAL_ROW_LIMIT = 12;
const PRELOAD_COUNT = 4;
const TOP_TEN_LIMIT = 10;

const ContentWrapper = ({
  enums,
  isMusic,
  showPagination,
  imageStyle,
  topTen = false,
  style,
  enabled = true,
  onContentAvailabilityChange,
}: Props) => {
  const [content, setContent] = useState<IVODContent[]>(() => {
    const cached = filterCategoryVodContent(
      getVodRowCache(enums._id) ?? [],
      !!isMusic,
    );
    return topTen ? cached.slice(0, TOP_TEN_LIMIT) : cached;
  });
  const [loading, setLoading] = useState<boolean>(content.length === 0);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const cached = filterCategoryVodContent(
      getVodRowCache(enums._id) ?? [],
      !!isMusic,
    );
    if (cached?.length) {
      setContent(topTen ? cached.slice(0, TOP_TEN_LIMIT) : cached);
      setLoading(false);
    }

    const fetchVODContent = async () => {
      try {
        if (!cached?.length) setLoading(true);
        const res = topTen
          ? await getTopTenVODs()
          : await getVODbyEnumID({
              enumId: enums._id,
              pagination: {page: 1, limit: INITIAL_ROW_LIMIT},
              musicVideoCategory: !!isMusic,
            });
        if (res.ok && res.data) {
          const rowContent = topTen
            ? (res.data.data ?? []).slice(0, TOP_TEN_LIMIT)
            : res.data.data;
          setContent(rowContent);
          setVodRowCache(enums._id, rowContent);
          const preload = (rowContent ?? [])
            .slice(0, PRELOAD_COUNT)
            .map(v => v.portraitPhoto)
            .filter((uri): uri is string => !!uri)
            .map(uri => ({
              uri,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            }));
          if (preload.length) FastImage.preload(preload);
        }
      } catch {
        // Keep cached content on failure.
      } finally {
        setLoading(false);
      }
    };

    fetchVODContent();
  }, [enums._id, enabled, isMusic, topTen]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [enums._id, content.length]);

  useEffect(() => {
    onContentAvailabilityChange?.(content.length > 0);
  }, [content.length, onContentAvailabilityChange]);

  if (!loading && content.length === 0) {
    return null;
  }

  return (
    <>
      <AppCategories
        title={enums.name}
        movieCategories={content}
        onPress={() => console.log('popular')}
        style={style ?? {marginRight: Size.calcHeight(12)}}
        imageStyle={imageStyle}
        tag={topTen}
        isLoading={loading && content.length === 0}
        video={isMusic}
        onIndexChange={showPagination ? setCurrentIndex : undefined}
      />

      {showPagination && !loading && content.length > 5 && (
        <View className="-mb-4 mt-4">
          <InfinityPaginationDots
            currentIndex={currentIndex}
            itemCount={content.length}
            visibleItems={VISIBLE_ITEMS}
          />
        </View>
      )}
    </>
  );
};

export default ContentWrapper;
