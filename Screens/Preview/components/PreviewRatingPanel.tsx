import {Pressable} from 'react-native';
import {AppButton, AppView} from '@/components';
import colors from '@/configs/colors';
import {BigClose} from '@/assets/icons';
import Size from '@/Utils/useResponsiveSize';
import {IVODContent, IVODRatings} from '@/types/api/content.types';
import RatingView from './RatingView';

type Props = {
  rating: number;
  setRating: (n: number) => void;
  previewContent: IVODContent;
  vodRating: IVODRatings | null;
  loading: boolean;
  onSubmit: () => void;
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
  <AppView style={{height: Size.getHeight() - 400}} className="relative">
    <AppView className="px-5 w-full">
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
      title="Submit"
      onPress={onSubmit}
      style={{width: '90%', alignSelf: 'center', marginTop: 45}}
    />
    <Pressable
      style={{position: 'absolute', bottom: 0, alignSelf: 'center'}}
      onPress={onClose}>
      <BigClose />
    </Pressable>
  </AppView>
);

export default PreviewRatingPanel;
