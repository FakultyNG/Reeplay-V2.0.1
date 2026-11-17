import React from 'react';
import {StyleSheet} from 'react-native';
import StarRating, {StarIconProps} from 'react-native-star-rating-widget';
import {AppText, AppView} from '@/components';
import {BigRateStart_F, BigRateStart_W, RateStar_F} from '@/assets/icons';
import HalfStar from '@/assets/icons/half_star.svg';
import colors from '@/configs/colors';
import {IVODContent, IVODRatings} from '@/types/api/content.types';

type Props = {
  rating: number;
  setRating: (rating: number) => void;
  vodRatings: IVODRatings | null;
  vod: IVODContent;
};

const ratingLabels = [
  'Select a rating',
  'Not for me',
  'Fair',
  'Good',
  'Great',
  'Excellent',
];

const RatingStarIcon = ({type}: StarIconProps) =>
  type === 'full' ? (
    <BigRateStart_F />
  ) : type === 'empty' ? (
    <BigRateStart_W />
  ) : (
    <HalfStar />
  );

const RatingView = ({vod, rating, setRating, vodRatings}: Props) => {
  const total = vodRatings?.totalStats[0]?.totalRatingsDocuments ?? 0;
  const average =
    vodRatings?.totalStats[0]?.averageRating ?? vod.averageRating ?? 0;
  const counts = new Map(
    (vodRatings?.groupStats ?? []).map(item => [item.rate, item.count]),
  );

  return (
    <AppView className="rounded-[20px] bg-[#171717] border border-white/10 px-4 py-5">
      <AppView className="flex-row items-center">
        <AppView className="w-[92px] items-center pr-4 border-r border-white/10">
          <AppText className="font-MANROPE_700 text-white text-[38px] leading-[44px]">
            {Number(average).toFixed(1)}
          </AppText>
          <AppView className="flex-row items-center mt-1">
            <RateStar_F />
            <AppText className="font-MANROPE_500 text-grey_200 text-[11px] ml-1">
              out of 5
            </AppText>
          </AppView>
          <AppText className="font-MANROPE_400 text-grey_200 text-[10px] mt-2">
            {total.toLocaleString()} {total === 1 ? 'rating' : 'ratings'}
          </AppText>
        </AppView>

        <AppView className="flex-1 pl-4 gap-y-[7px]">
          {[5, 4, 3, 2, 1].map(star => (
            <DistributionRow
              key={star}
              star={star}
              progress={total > 0 ? (counts.get(star) ?? 0) / total : 0}
            />
          ))}
        </AppView>
      </AppView>

      <AppView className="h-[1px] bg-white/10 my-5" />

      <AppView className="items-center">
        <AppText className="font-MANROPE_600 text-white text-[15px] mb-3">
          {vodRatings?.myRating ? 'Your rating' : 'How was it?'}
        </AppText>
        <StarRating
          rating={rating}
          onChange={setRating}
          step="full"
          StarIconComponent={RatingStarIcon}
        />
        <AppText
          className={`font-MANROPE_600 text-[13px] mt-3 ${
            rating > 0 ? 'text-yellow' : 'text-grey_200'
          }`}>
          {ratingLabels[rating] ?? ratingLabels[0]}
        </AppText>
      </AppView>
    </AppView>
  );
};

const DistributionRow = ({star, progress}: {star: number; progress: number}) => (
  <AppView className="flex-row items-center">
    <AppText className="w-3 text-right font-MANROPE_500 text-grey_200 text-[10px]">
      {star}
    </AppText>
    <AppView className="mx-1.5 scale-75">
      <RateStar_F />
    </AppView>
    <RatingBar progress={progress} />
  </AppView>
);

const RatingBar = ({progress}: {progress: number}) => {
  const percentage = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  const width = `${percentage}%` as `${number}%`;

  return (
    <AppView className="flex-1 h-[5px] rounded-full bg-[#333333] overflow-hidden">
      <AppView style={[styles.progressBar, {width}]} />
    </AppView>
  );
};

const styles = StyleSheet.create({
  progressBar: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.RED,
  },
});

export default RatingView;
