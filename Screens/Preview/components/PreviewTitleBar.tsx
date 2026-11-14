import {ActivityIndicator, Pressable} from 'react-native';
import {Fragment} from 'react';
import {AppText, AppView, TouchableOpacity} from '@/components';
import colors from '@/configs/colors';
import {ShareIcon, VideoLogIcon, VideoLog_F} from '@/assets/icons';
import {truncateText} from '@/Utils/textUtils';
import {IVODContent} from '@/types/api/content.types';

type Props = {
  previewContent: IVODContent;
  loading: boolean;
  inWatchlist: boolean;
  onWatchlist: () => void;
  onShare: () => void;
};

const PreviewTitleBar = ({
  previewContent,
  loading,
  inWatchlist,
  onWatchlist,
  onShare,
}: Props) => {
  const isMusicVideo = previewContent.type
    .toLowerCase()
    .replace(/[\s_-]+/g, '-') === 'music-video';
  const artistName = previewContent.artistName?.trim();

  return (
    <AppView className="px-5 flex-row items-center justify-between mt-[13px]">
      <Pressable style={{marginLeft: 6}} onPress={onWatchlist}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.DARK_GREY} />
        ) : inWatchlist ? (
          <VideoLog_F />
        ) : (
          <VideoLogIcon />
        )}
      </Pressable>
      <AppView>
        <AppText className="text-[21px] text-grey_100 font-ROBOTO_700 text-center">
          {truncateText(20, previewContent.title)}
        </AppText>
        <AppView className="mt-2 flex-row items-center justify-center">
          {isMusicVideo ? (
            artistName ? (
              <AppText className="font-ROBOTO_700 text-xs text-grey_white">
                {artistName}
              </AppText>
            ) : null
          ) : (
            previewContent.genre?.map((tag, i) => (
              <Fragment key={tag._id ?? i}>
                <AppText className="font-ROBOTO_700 text-xs text-grey_white">
                  {tag.name}
                </AppText>
                {i !== (previewContent.genre?.length ?? 0) - 1 && (
                  <AppView className="w-1.5 h-1.5 rounded-full bg-white mt-[2.8px] mx-1.5" />
                )}
              </Fragment>
            ))
          )}
        </AppView>
      </AppView>
      <TouchableOpacity onPress={onShare} accessibilityLabel="Share content">
        <ShareIcon />
      </TouchableOpacity>
    </AppView>
  );
};

export default PreviewTitleBar;
