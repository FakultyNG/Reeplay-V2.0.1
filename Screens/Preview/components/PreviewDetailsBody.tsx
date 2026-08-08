import {Dispatch, SetStateAction, ReactNode} from 'react';
import {Platform, Text, View} from 'react-native';
import {AppButton, AppText, AppView, TouchableOpacity} from '@/components';
import colors from '@/configs/colors';
import {PreviewDownloadIcon, PreviewPlayIcon} from '@/assets/icons';
import DownloadedCompleteIcon from '@/assets/icons/Download.svg';
import fonts from '@/configs/fonts';
import {StyleSheet} from 'react-native';
import {previewContentType} from '@/navigation/AppNavigator';
import {IDownloadData, IVODContent} from '@/types/api/content.types';
import PreviewDynamicContent from './PreviewDynamicContent';

type Props = {
  content: string;
  previewContent: IVODContent;
  contentType: string;
  contentPrice: string;
  seeMore: boolean;
  setSeeMore: (v: boolean) => void;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadPercentage: number;
  accessStatus: boolean;
  onDownload: () => void;
  onWatch: () => void;
  makeFullscreen: () => void;
  setFullscreenContent: Dispatch<SetStateAction<IDownloadData | null>>;
};

const classBadge = (contentType: string) => (
  <AppView
    className={`mx-auto ${
      contentType === 'premium'
        ? 'border-green px-1.5'
        : contentType === 'free'
          ? 'border-yellow px-3'
          : 'border-red px-1.5'
    } pt-1.5 pb-1.5 border rounded-[3px]`}>
    <AppText
      className={`text-[9px] uppercase font-ROBOTO_400 ${
        contentType === 'premium'
          ? 'text-green'
          : contentType === 'free'
            ? 'text-yellow'
            : 'text-red'
      }`}>
      {contentType}
    </AppText>
  </AppView>
);

const PreviewDetailsBody = ({
  content,
  previewContent,
  contentType,
  contentPrice,
  seeMore,
  setSeeMore,
  isDownloaded,
  isDownloading,
  downloadPercentage,
  accessStatus,
  onDownload,
  onWatch,
  makeFullscreen,
  setFullscreenContent,
}: Props) => {
  const isAndroid = Platform.OS === 'android';
  const seeMoreThreshold = isAndroid ? 130 : 20;
  const showSeeMore = isAndroid
    ? previewContent.description.length > seeMoreThreshold && !seeMore
    : previewContent.description.length > seeMoreThreshold;

  const downloadDisabled = isAndroid
    ? isDownloaded || isDownloading || !accessStatus
    : isDownloaded;

  return (
    <AppView className="px-5">
      <AppView
        className={`items-center mt-5 px-4 ${isAndroid ? 'w-full' : ''}`}>
        <AppText className="font-ROBOTO_400 uppercase text-white text-[11px]">
          {previewContentType[content]}
        </AppText>
        <View
          key={isAndroid ? previewContent.description.length : undefined}
          className={
            isAndroid
              ? 'mt-2 flex-col items-center justify-center'
              : undefined
          }>
          <AppText
            {...(!seeMore && {numberOfLines: 2})}
            className={`text-center font-ROBOTO_400 text-white text-xs ${
              isAndroid ? '' : 'flex-1'
            }`}>
            {previewContent.description}
          </AppText>
          {showSeeMore && (
            <TouchableOpacity
              className="ml-1.5"
              onPress={() => setSeeMore(!seeMore)}>
              <AppText className="font-ROBOTO_500 text-white text-sm">
                See More
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        <AppView className="my-3.5 w-full justify-center relative">
          {content !== previewContentType['tv series'] && (
            <View>
              <TouchableOpacity
                disabled={downloadDisabled}
                style={
                  !isAndroid
                    ? {opacity: isDownloaded ? 0.4 : 1}
                    : undefined
                }
                className={`absolute right-2 z-20 items-center ${
                  isAndroid && downloadDisabled ? 'opacity-35' : ''
                }`}
                onPress={onDownload}>
                {isAndroid && isDownloaded ? (
                  <DownloadedCompleteIcon />
                ) : (
                  <>
                    <PreviewDownloadIcon />
                    {isAndroid && isDownloading && (
                      <Text className="font-ROBOTO_400 text-white text-sm text-center my-[2px]">
                        {downloadPercentage}%
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
          {classBadge(contentType)}
        </AppView>

        <AppButton
          title={contentPrice}
          style={
            isAndroid
              ? {marginTop: 10, width: '95%', borderRadius: 15}
              : {marginTop: 10, width: '100%'}
          }
          bgColor={colors.RED}
          labelStyle={styles.btnLabel}
          onPress={onWatch}
          iconRight={
            contentPrice === 'Watch' ? <PreviewPlayIcon /> : <></>
          }
        />
      </AppView>

      <PreviewDynamicContent
        content={content}
        previewContent={previewContent}
        accessStatus={accessStatus}
        makeFullscreen={makeFullscreen}
        setFullscreenContent={setFullscreenContent}
      />
    </AppView>
  );
};

export default PreviewDetailsBody;

const styles = StyleSheet.create({
  btnLabel: {
    fontFamily: fonts.ROBOTO_700,
    fontSize: 17,
    color: colors.GREY_100,
    marginLeft: 8,
    marginTop: 1,
    textTransform: 'uppercase',
  },
});
