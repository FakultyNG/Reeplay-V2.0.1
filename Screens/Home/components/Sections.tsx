import {StyleSheet} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {AppView} from '@/components';
import Size from '@/Utils/useResponsiveSize';
import ContentWrapper from '@/components/ContentWrapper';
import {useAppSelector} from '@/Hooks/reduxHook';
import {selectCategories} from '@/store/slices/bannerSlice.slice';
import PremiumAdsCarousel from './PremiumAdsCarousel';
import {ICategoryData} from '@/types/api/content.types';
import PersonalizedRow from './PersonalizedRow';
import {selectHomeAds} from '@/store/slices/adsSlice.slice';

interface Props {
  /** When true, only first few category rows fetch/render network. */
  deferHeavy?: boolean;
  /** Content that must remain directly below the first category row. */
  afterFirstCategory?: React.ReactNode;
}

const IMMEDIATE_ROW_COUNT = 3;
const ROW_STAGGER_MS = 450;
const TOP_TEN_ROW: ICategoryData = {
  _id: 'home-top-ten',
  name: 'Top 10',
  createdAt: '',
  updatedAt: '',
  position: 0,
};

type CategoryRowProps = {
  category: ICategoryData;
  index: number;
  isTop10: boolean;
  isComingSoon: boolean;
  isMusic: boolean;
};

const CategoryRow = ({
  category,
  index,
  isTop10,
  isComingSoon,
  isMusic,
}: CategoryRowProps) => {
  const [hasContent, setHasContent] = useState(false);
  const updateAvailability = useCallback((available: boolean) => {
    setHasContent(available);
  }, []);

  return (
    <AppView
      style={{
        display: hasContent ? 'flex' : 'none',
        marginTop: index === 0 ? 32 : 24,
      }}
      className={`pl-5 ${isComingSoon ? 'mb-[40px]' : ''}`}>
      <ContentWrapper
        enums={category}
        showPagination={index === 0}
        style={{
          marginRight: Size.calcHeight(isTop10 || isComingSoon ? 8 : 12),
        }}
        imageStyle={
          isComingSoon || isTop10 ? {} : isMusic ? styles.videoBackdrop : {}
        }
        topTen={isTop10}
        isMusic={isMusic}
        enabled
        onContentAvailabilityChange={updateAvailability}
      />
    </AppView>
  );
};

const Sections = ({deferHeavy = false, afterFirstCategory}: Props) => {
  const cat = useAppSelector(selectCategories);
  const homeAds = useAppSelector(selectHomeAds);
  const [enabledCount, setEnabledCount] = useState(IMMEDIATE_ROW_COUNT);

  useEffect(() => {
    setEnabledCount(IMMEDIATE_ROW_COUNT);
  }, [cat.length]);

  useEffect(() => {
    if (deferHeavy || cat.length <= IMMEDIATE_ROW_COUNT) {
      return;
    }
    const id = setInterval(() => {
      setEnabledCount(prev => {
        if (prev >= cat.length) {
          clearInterval(id);
          return prev;
        }
        return prev + 1;
      });
    }, ROW_STAGGER_MS);
    return () => clearInterval(id);
  }, [deferHeavy, cat.length]);

  if (cat.length === 0) {
    return null;
  }

  const visibleCount = deferHeavy
    ? IMMEDIATE_ROW_COUNT
    : Math.max(enabledCount, IMMEDIATE_ROW_COUNT);
  const categoryRows = cat.slice(0, visibleCount);
  const legacyTopTenIndex = categoryRows.findIndex(row =>
    row.name.toLowerCase().includes('top 10'),
  );
  const rows = categoryRows.filter(
    row => !row.name.toLowerCase().includes('top 10'),
  );
  rows.splice(
    legacyTopTenIndex >= 0 ? legacyTopTenIndex : Math.min(1, rows.length),
    0,
    TOP_TEN_ROW,
  );

  return (
    <>
      {rows.map((x, i) => {
        const isTop10 = x._id === TOP_TEN_ROW._id;
        const isComingSoon = x.name.toLowerCase().includes('comming soon');
        const isMusic = x.name.toLowerCase().includes('music');
        const isPremiumAds = x.name.trim().toLowerCase() === 'premium ads';
        const isPersonalized = x.feedType === 'personalized';
        let section: React.ReactNode;

        if (isPersonalized) {
          section = <PersonalizedRow title={x.name} />;
        } else if (isPremiumAds) {
          section = homeAds.length > 0 ? (
            <AppView className="mt-6 pl-5">
              <PremiumAdsCarousel title={x.name} />
            </AppView>
          ) : null;
        } else {
          section = (
            <CategoryRow
              category={x}
              index={i}
              isTop10={isTop10}
              isComingSoon={isComingSoon}
              isMusic={isMusic}
            />
          );
        }

        return (
          <React.Fragment key={x._id ?? i}>
            {section}
            {i === 0 ? afterFirstCategory : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default Sections;

const styles = StyleSheet.create({
  videoBackdrop: {
    width: Size.calcWidth(182),
    height: Size.calcHeight(146),
  },
});
