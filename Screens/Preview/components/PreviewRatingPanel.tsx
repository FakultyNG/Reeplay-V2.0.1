import {Pressable, StyleSheet} from 'react-native';
import {AppButton, AppText, AppView} from '@/components';
import colors from '@/configs/colors';
import Size from '@/Utils/useResponsiveSize';
import {IVODContent, IVODRatings} from '@/types/api/content.types';
import RatingView from './RatingView';

type Props = {
  rating: number;
  setRating: (n: number) => void;
  previewContent: IVODContent;
  vodRating: IVODRatings | null;
  loading: boolean;
  onSubmit: () => void | Promise<void>;
  onClose: () => void;
};

const PreviewRatingPanel = ({
  rating,
  setRating,
  previewContent,
  vodRating,
  loading,
  onSubmit,
  onClose,
}: Props) => (
  <AppView
    style={{minHeight: Size.getHeight() - 360}}
    className="relative px-5 pt-5 pb-8">
    <AppView className="flex-row items-start justify-between mb-5">
      <AppView className="flex-1 pr-4">
        <AppText className="font-MANROPE_700 text-white text-[22px]">
          Rate this title
        </AppText>
        <AppText className="font-MANROPE_400 text-grey_200 text-[13px] mt-1 leading-5">
          Your rating helps improve recommendations for everyone.
        </AppText>
      </AppView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close rating panel"
        className="w-9 h-9 rounded-full bg-[#242424] items-center justify-center"
        onPress={onClose}>
        <AppText className="text-white text-[22px] leading-[24px]">×</AppText>
      </Pressable>
    </AppView>
    <AppView className="w-full">
      <RatingView
        rating={rating}
        setRating={setRating}
        vod={previewContent}
        vodRatings={vodRating}
      />
    </AppView>
    <AppButton
      bgColor={colors.RED}
      isLoading={loading}
      isDisable={rating === 0}
      title={vodRating?.myRating ? 'Update rating' : 'Submit rating'}
      onPress={onSubmit}
      style={styles.submitButton}
    />
    <AppText className="font-MANROPE_400 text-grey_200 text-[11px] text-center mt-3">
      You can update your rating at any time.
    </AppText>
  </AppView>
);

const styles = StyleSheet.create({
  submitButton: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 24,
  },
});

export default PreviewRatingPanel;
