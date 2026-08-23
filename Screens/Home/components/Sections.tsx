import {StyleSheet} from 'react-native';
import React, {useEffect, useState} from 'react';
import {AppView} from '@/components';
import Size from '@/Utils/useResponsiveSize';
import ContentWrapper from '@/components/ContentWrapper';
import {useAppSelector} from '@/Hooks/reduxHook';
import {selectCategories} from '@/store/slices/bannerSlice.slice';
import LiveEmptyState from '@/Screens/Live/components/LiveEmptyState';
import {FHomeIcon} from '@/assets/icons';

interface Props {
  isSkipped: boolean;
  /** When true, only first few category rows fetch/render network. */
  deferHeavy?: boolean;
}

const IMMEDIATE_ROW_COUNT = 3;
const ROW_STAGGER_MS = 450;

const Sections = ({isSkipped, deferHeavy = false}: Props) => {
  const cat = useAppSelector(selectCategories);
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
    return (
      <LiveEmptyState
        icon={<FHomeIcon width={36} height={20} />}
        title="No categories yet"
        message="Home sections will appear here when titles are available. Check back later."
      />
    );
  }

  const immediate = cat.slice(0, IMMEDIATE_ROW_COUNT);
  const deferred = cat.slice(IMMEDIATE_ROW_COUNT, cat.length - 1);
  const visibleCount = deferHeavy
    ? IMMEDIATE_ROW_COUNT
    : Math.max(enabledCount, IMMEDIATE_ROW_COUNT);
  const rows = [...immediate, ...deferred].slice(0, visibleCount);

  return (
    <>
      {isSkipped && (
        <AppView className="mt-10 pl-5">
          <ContentWrapper enums={cat[0]} showPagination enabled />
        </AppView>
      )}
      <AppView
        style={{marginTop: isSkipped ? 24 : 32}}
        className="pl-5">
        {cat.length > 1 && <ContentWrapper enums={cat[1]} enabled />}
      </AppView>

      {rows.slice(2).map((x, i) => {
        const isTop10 = x.name.toLowerCase().includes('top 10');
        const isComingSoon = x.name.toLowerCase().includes('comming soon');
        const isLive = x.name.toLowerCase().includes('live');
        const isMusic = x.name.toLowerCase().includes('music');
        return (
          <AppView
            key={x._id ?? i}
            className={`mt-6 pl-5 ${isComingSoon ? 'mb-[40px]' : ''}`}>
            <ContentWrapper
              enums={x}
              style={{
                marginRight: Size.calcHeight(
                  isTop10 || isComingSoon ? 8 : 12,
                ),
              }}
              imageStyle={
                isComingSoon || isTop10 ? {} : isMusic ? styles.videoBackdrop : {}
              }
              tag={isTop10}
              live={isLive}
              isMusic={isMusic}
              enabled
            />
          </AppView>
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
