import {View, ViewStyle} from 'react-native';
import React, {useEffect, useState} from 'react';
import {ICategoryData, IVODContent} from '@/types/api/content.types';
import {getVODbyEnumID} from '@/api/content.api';
import AppCategories from './AppCategories';
import Size from '@/Utils/useResponsiveSize';
import FastImage, {ImageStyle} from 'react-native-fast-image';
import {getVodRowCache, setVodRowCache} from '@/Utils/contentMmkv';
import LiveEmptyState from '@/Screens/Live/components/LiveEmptyState';
import SectionHeader from '@/Screens/Home/components/SectionHeader';
import {FHomeIcon} from '@/assets/icons';
import InfinityPaginationDots from './InfinityPaginationDots';

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

const VISIBLE_ITEMS = 3;
const INITIAL_ROW_LIMIT = 12;
const PRELOAD_COUNT = 4;

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
        pagination: {page: 1, limit: INITIAL_ROW_LIMIT},
      });
      if (res.ok && res.data) {
        setContent(res.data.data);
        setVodRowCache(enums._id, res.data.data);
        const preload = (res.data.data ?? [])
          .slice(0, PRELOAD_COUNT)
          .map(v => v.portraitPhoto)
          .filter((uri): uri is string => !!uri)
          .map(uri => ({
            uri,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }));
        if (preload.length) {
          FastImage.preload(preload);
        }
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
