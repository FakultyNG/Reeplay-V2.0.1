import {Platform, StatusBar} from 'react-native';
import React, {useEffect, useState} from 'react';
import {AppScreen, AppView} from '@/components';
import colors from '@/configs/colors';
import useToggle from '@/Hooks/useToggle';
import {useNavigation, useRoute} from '@react-navigation/native';
import {PreviewScreenRoute} from '@/types/typings';
import {RootNav} from '@/navigation/AppNavigator';
import routes from '@/navigation/routes';
import {useAppSelector} from '@/Hooks/reduxHook';
import {selectUserProfilePic} from '@/store/slices/userSlice';
import {IReplyDetails} from '@/types/api/comment.types';
import {IDownloadData} from '@/types/api/content.types';
import {useCommentHook} from './utils/commentHook';
import {OrientationInjectedProps} from '@/components/OrientationWrapper';
import {getWatchTag} from '@/Utils/contentUtils';
import DownloadFullscreenModalPlayer from '../Download/FullscreenModalPlayer';
import PreviewCommentPanel from './components/PreviewCommentPanel';
import PreviewTitleBar from './components/PreviewTitleBar';
import PreviewStatsRow from './components/PreviewStatsRow';
import PreviewHero from './components/PreviewHero';
import PreviewRatingPanel from './components/PreviewRatingPanel';
import PreviewDetailsBody from './components/PreviewDetailsBody';
import PreviewWatchModal from './components/PreviewWatchModal';
import PreviewPortraitScroll from './components/PreviewPortraitScroll';
import {usePreviewActions} from './hooks/usePreviewActions';
import {usePreviewDownload} from './hooks/usePreviewDownload';
import {usePreviewExitCover} from './hooks/usePreviewExitCover';

const PreviewScreen = ({
  isFullscreen,
  makeFullscreen,
  makePortrait,
}: OrientationInjectedProps) => {
  const userPic = useAppSelector(selectUserProfilePic);
  const [loading_r, setLoading_r] = useState(false);
  const [addRatting, setAddRating] = useToggle(false);
  const [watchModal, setWatchModal] = useToggle(false);
  const [isComment, setIsComment] = useState(false);
  const route = useRoute<PreviewScreenRoute>();
  const {navigate} = useNavigation<RootNav>();
  const [replyDetails, setRepliesDetails] = useState<IReplyDetails | null>(
    null,
  );
  const [commentTxt, setCommentTxt] = useState('');
  const [rating, setRating] = useState(0);
  const [seeMore, setSeeMore] = useState(false);
  const [isFullscreenContent, setFullscreenContent] =
    useState<IDownloadData | null>(null);

  const {showExitCover, headerMountKey} = usePreviewExitCover(isFullscreen);

  const {
    previewContent,
    premiumCost,
    addWatchList_boolean,
    loading,
    commentCount,
    vodRating,
    accessStatus,
    contentType,
    contentPrice,
    handleAddRating,
    handleAddWatchList,
    handleShare,
    getCommentCount,
  } = usePreviewActions({
    isFullscreen,
    isComment,
    rating,
    setLoading_r,
  });

  const {isDownloaded, isDownloading, downloadPercentage, handleDownload} =
    usePreviewDownload(previewContent);

  const content = route.params.content;

  const {addCommentFunc, loading: loadingComment} = useCommentHook({
    handleFinalFunc: () => getCommentCount(),
    resetFunc: () => [setCommentTxt(''), setRepliesDetails(null)],
    text: commentTxt,
    vodId: previewContent._id,
    ...(replyDetails && {
      parentCommentId: replyDetails.commentId,
      parentReplyId: replyDetails.replyId,
      reply: true,
    }),
  });

  useEffect(() => {
    if (!isFullscreen) {
      setFullscreenContent(null);
    }
  }, [isFullscreen]);

  const handleWatchPress = () => {
    if (Platform.OS === 'ios') {
      setWatchModal();
      return;
    }
    if (accessStatus) {
      makeFullscreen();
      return;
    }
    navigate(routes.MAIN, {
      screen: routes.SUBSCRIPTION_SCREEN,
      params: {
        tab: getWatchTag(previewContent.vidClass, false),
        currency:
          contentType === 'premium' && premiumCost
            ? premiumCost.currencyCode
            : previewContent.currency,
        amount: `${
          contentType === 'premium' && premiumCost
            ? premiumCost.amount
            : previewContent.amount
        }`,
        stage: 'paymentSummary',
        metadata: {videoId: previewContent._id},
      },
    });
  };

  return (
    <>
      {!(isFullscreenContent && isFullscreen) && (
        <AppScreen
          isFullscreen={isFullscreen}
          containerStyle={{
            position: 'relative',
            paddingBottom: 100,
            paddingHorizontal: 0,
            flex: 1,
          }}
          className="bg-black">
          <StatusBar
            hidden={isFullscreen}
            translucent
            backgroundColor={colors.DEEP_BLACK}
          />

          <PreviewHero
            isFullscreen={isFullscreen}
            headerMountKey={headerMountKey}
            showExitCover={showExitCover}
            previewContent={previewContent}
            onToggleFullscreen={
              isFullscreen ? makePortrait : makeFullscreen
            }
          />

          {!isFullscreen && (
            <>
              <AppView className="h-full">
                <PreviewTitleBar
                  previewContent={previewContent}
                  loading={loading}
                  inWatchlist={addWatchList_boolean}
                  onWatchlist={handleAddWatchList}
                  onShare={handleShare}
                />

                {!addRatting && (
                  <PreviewStatsRow
                    previewContent={previewContent}
                    commentCount={commentCount}
                    accessStatus={accessStatus}
                    onRate={() => [setIsComment(false), setAddRating()]}
                    onToggleComments={() => setIsComment(!isComment)}
                  />
                )}

                <PreviewPortraitScroll
                  isComment={isComment}
                  showingRating={addRatting}
                  commentPanel={
                    isComment ? (
                      <PreviewCommentPanel
                        commentCount={commentCount}
                        commentTxt={commentTxt}
                        setCommentTxt={setCommentTxt}
                        replyDetails={replyDetails}
                        setRepliesDetails={setRepliesDetails}
                        userPic={userPic}
                        vodId={previewContent._id}
                        loadingComment={loadingComment}
                        addCommentFunc={addCommentFunc}
                        onClose={() => setIsComment(false)}
                      />
                    ) : null
                  }
                  ratingPanel={
                    <PreviewRatingPanel
                      rating={rating}
                      setRating={setRating}
                      previewContent={previewContent}
                      vodRating={vodRating}
                      loading={loading_r}
                      onSubmit={handleAddRating}
                      onClose={setAddRating}
                    />
                  }
                  detailsBody={
                    <PreviewDetailsBody
                      content={content}
                      previewContent={previewContent}
                      contentType={contentType}
                      contentPrice={contentPrice}
                      seeMore={seeMore}
                      setSeeMore={setSeeMore}
                      isDownloaded={isDownloaded}
                      isDownloading={isDownloading}
                      downloadPercentage={downloadPercentage}
                      accessStatus={accessStatus}
                      onDownload={handleDownload}
                      onWatch={handleWatchPress}
                      makeFullscreen={makeFullscreen}
                      setFullscreenContent={setFullscreenContent}
                    />
                  }
                />
              </AppView>

              <PreviewWatchModal
                visible={watchModal}
                contentType={contentType}
                onClose={() => setWatchModal(false)}
              />
            </>
          )}
        </AppScreen>
      )}

      {isFullscreenContent && isFullscreen && (
        <DownloadFullscreenModalPlayer
          isFullscreen={isFullscreen}
          content={isFullscreenContent}
          setFullscreen={() =>
            isFullscreen
              ? [makePortrait(), setFullscreenContent(null)]
              : makeFullscreen()
          }
        />
      )}
    </>
  );
};

export default PreviewScreen;
