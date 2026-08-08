import {Text, View} from 'react-native';
import {AppText, AppView, TouchableOpacity} from '@/components';
import {SM_Rate_F} from '@/assets/icons';
import {formatLikesNumber} from '@/Utils/formatAmount';
import {IVODContent} from '@/types/api/content.types';

type Props = {
  previewContent: IVODContent;
  commentCount: number;
  accessStatus: boolean;
  onRate: () => void;
  onToggleComments: () => void;
};

const Divider = () => (
  <AppView className="h-[30px] w-[1px] border-l border-grey_200/10" />
);

const PreviewStatsRow = ({
  previewContent,
  commentCount,
  accessStatus,
  onRate,
  onToggleComments,
}: Props) => (
  <AppView className="px-5">
    <AppView className="border-y border-grey_200/10 py-[7px] mt-4 flex-row items-center justify-between">
      <TouchableOpacity disabled={!accessStatus} onPress={onRate}>
        <AppText className="text-center font-ROBOTO_400 text-grey_200 text-[11px]">
          {formatLikesNumber(previewContent.viewsCount)} VIEWS
        </AppText>
        <View className="flex-row items-center justify-center gap-x-1 my-1">
          <AppText className="text-center font-ROBOTO_700 text-grey_200 text-[15px]">
            {previewContent.averageRating}
          </AppText>
          <SM_Rate_F />
        </View>
        <Text className="text-center font-ROBOTO_400 text-grey_200 text-[10px]">
          Tap to Rate
        </Text>
      </TouchableOpacity>
      <Divider />
      <AppView>
        <AppText className="text-center font-ROBOTO_400 text-grey_200 text-[11px]">
          PG
        </AppText>
        <AppText className="text-center my-1 font-ROBOTO_700 text-grey_200 text-[15px]">
          {previewContent.pg}+
        </AppText>
        <AppText className="text-center font-ROBOTO_400 text-grey_200 text-[10px]">
          Years Old
        </AppText>
      </AppView>
      <Divider />
      <TouchableOpacity onPress={onToggleComments}>
        <AppText className="text-center font-ROBOTO_400 text-grey_200 text-[11px]">
          COMMENTS
        </AppText>
        <AppText className="text-center my-1 font-ROBOTO_700 text-grey_200 text-[15px]">
          {formatLikesNumber(commentCount)}
        </AppText>
        <AppText className="text-center font-ROBOTO_400 text-grey_200 text-[10px]">
          Tap to Add
        </AppText>
      </TouchableOpacity>
      <Divider />
      <AppView>
        <AppText className="text-center font-ROBOTO_400 text-grey_200 text-[11px]">
          DURATION
        </AppText>
        <AppText className="text-center my-1 font-ROBOTO_700 text-grey_200 text-[15px]">
          {previewContent.runtime}
        </AppText>
        <AppText className="text-center font-ROBOTO_400 text-grey_200 text-[10px]">
          {new Date(previewContent.releaseDate).getFullYear()}
        </AppText>
      </AppView>
    </AppView>
  </AppView>
);

export default PreviewStatsRow;
