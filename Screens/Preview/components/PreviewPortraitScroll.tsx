import {Platform, ScrollView} from 'react-native';
import {ReactNode} from 'react';
import {AppView} from '@/components';
import Size from '@/Utils/useResponsiveSize';

type Props = {
  isComment: boolean;
  commentPanel: ReactNode;
  showingRating: boolean;
  ratingPanel: ReactNode;
  detailsBody: ReactNode;
};

/** Platform-specific scroll chrome around comments / rating / details. */
const PreviewPortraitScroll = ({
  isComment,
  commentPanel,
  showingRating,
  ratingPanel,
  detailsBody,
}: Props) => {
  if (Platform.OS === 'ios') {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={isComment && {paddingBottom: Size.hp(20)}}>
        <AppView
          style={isComment ? {height: Size.getHeight() - 100} : {flex: 1}}
          className="relative mt-1">
          {commentPanel}
          <ScrollView
            contentContainerStyle={{paddingBottom: 100, paddingTop: 2}}
            showsVerticalScrollIndicator={false}>
            {showingRating ? ratingPanel : detailsBody}
          </ScrollView>
        </AppView>
      </ScrollView>
    );
  }

  return (
    <AppView
      style={isComment ? {height: Size.hp(55)} : {flex: 1}}
      className="relative mt-1">
      {commentPanel}
      <ScrollView
        contentContainerStyle={{paddingBottom: Size.hp(20), paddingTop: 2}}
        showsVerticalScrollIndicator={false}>
        {showingRating ? ratingPanel : detailsBody}
      </ScrollView>
    </AppView>
  );
};

export default PreviewPortraitScroll;
