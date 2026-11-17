import {useCallback, useEffect, useState} from 'react';
import Share from 'react-native-share';
import {buildShareUrl} from '@/Utils/shareLinks';
import {useIsFocused} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {
  selectPreviewVODContent,
  setPreviewContent,
} from '@/store/slices/previewContentSlice';
import ToastNotification from '@/components/ToastNotifications';
import {
  addWatchList,
  checkIsWatchList,
  removeWatchList,
} from '@/api/watchlist.api';
import {totalCommentCount} from '@/api/comment.api';
import {deleteWatchlistById} from '@/store/slices/userSlice';
import {
  addVODRating,
  fetchVODDetails,
  getVODRatings,
  hasPaidContentStatus,
} from '@/api/content.api';
import {IVODRatings} from '@/types/api/content.types';
import {formatAmount} from '@/Utils/formatAmount';
import {selectUserPremiumCost} from '@/store/slices/bannerSlice.slice';
import getSymbolFromCurrency from 'currency-symbol-map';
import Orientation from 'react-native-orientation-locker';
import {
  analyticsId,
  flushAnalyticsEvents,
  queueAnalyticsEvent,
} from '@/api/analytics.api';
import {useGuestAccessStore} from '@/store/guestAccess.store';
import {requireRegisteredUser} from '@/Utils/guestAccess';

type Options = {
  isFullscreen: boolean;
  isComment: boolean;
  rating: number;
  setRating: (rating: number) => void;
  setLoading_r: (v: boolean) => void;
};

export function usePreviewActions({
  isFullscreen,
  rating,
  setRating,
  setLoading_r,
}: Options) {
  const dispatch = useAppDispatch();
  const previewContent = useAppSelector(selectPreviewVODContent);
  const premiumCost = useAppSelector(selectUserPremiumCost);
  const isFocused = useIsFocused();
  const isGuest = useGuestAccessStore(state => state.isGuest);

  const [addWatchList_boolean, setAddWatchList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [vodRating, setVODRating] = useState<IVODRatings | null>(null);
  const [accessStatus, setAccessStatus] = useState(false);

  const contentType = previewContent.vidClass;
  const contentPrice = accessStatus
    ? 'Watch'
    : previewContent.amount && previewContent.currency
      ? `${getSymbolFromCurrency(previewContent.currency)}${formatAmount(
          previewContent.amount,
          previewContent.currency,
        )}`
      : contentType === 'premium' &&
          premiumCost?.currencyCode &&
          premiumCost.amount
        ? `${getSymbolFromCurrency(premiumCost.currencyCode)}${formatAmount(
            premiumCost.amount,
            premiumCost.currencyCode,
          )}`
        : 'Watch';

  const handleFetchVodMeta = useCallback(async () => {
    const res = await fetchVODDetails({_id: previewContent._id});
    if (res.ok && res.data) {
      const data = res.data.data;
      dispatch(
        setPreviewContent({
          ...previewContent,
          viewsCount: data.viewsCount,
          averageRating: data.averageRating,
        }),
      );
    }
  }, [dispatch, previewContent]);

  const getCommentCount = useCallback(async () => {
    const res = await totalCommentCount(previewContent._id);
    if (res.ok && res.data) {
      setCommentCount(res.data.data.totalComments);
    }
  }, [previewContent._id]);

  const handleVODRating = useCallback(async () => {
    const res = await getVODRatings(previewContent._id);
    if (res.ok && res.data) {
      setVODRating(res.data.data);
      setRating(res.data.data.myRating?.rate ?? 0);
    }
  }, [previewContent._id, setRating]);

  const handleAddRating = useCallback(async () => {
    if (!requireRegisteredUser()) return;
    let saved = false;
    try {
      setLoading_r(true);
      const res = await addVODRating({
        rate: rating,
        parentId: previewContent._id,
        parentType: 'vod',
      });
      if (res.ok && res.data) {
        ToastNotification('success', 'Rating saved');
        saved = true;
      } else {
        ToastNotification('error', `${res.data?.message}`);
      }
    } catch (error) {
      ToastNotification('error', `${error}`);
    } finally {
      setLoading_r(false);
      await handleVODRating();
      await handleFetchVodMeta();
    }
    return saved;
  }, [
    handleFetchVodMeta,
    handleVODRating,
    previewContent._id,
    rating,
    setLoading_r,
  ]);

  const getWatchListStatus = useCallback(async () => {
    if (isGuest) {
      setAddWatchList(false);
      return;
    }
    const res = await checkIsWatchList(previewContent._id);
    if (res.ok && res.data) {
      setAddWatchList(res.data.data.isListed);
    }
  }, [isGuest, previewContent._id]);

  const handleAddWatchList = useCallback(async () => {
    if (!requireRegisteredUser()) return;
    try {
      setLoading(true);
      setAddWatchList(!addWatchList_boolean);
      const res = addWatchList_boolean
        ? await removeWatchList(previewContent._id)
        : await addWatchList(previewContent._id);
      if (res.ok && res.data) {
        ToastNotification(
          'success',
          addWatchList_boolean
            ? 'Removed from your watchlist'
            : 'Added to your watchlist',
        );
        if (addWatchList_boolean) {
          dispatch(deleteWatchlistById(previewContent._id));
        }
      } else {
        ToastNotification('error', `${res.data?.message}`);
        setAddWatchList(addWatchList_boolean);
      }
    } catch (error) {
      ToastNotification('error', `${error}`);
    } finally {
      setLoading(false);
      getWatchListStatus();
    }
  }, [
    addWatchList_boolean,
    dispatch,
    getWatchListStatus,
    previewContent._id,
  ]);

  const handleContentStatusUpdate = useCallback(async () => {
    if (contentType === 'free') {
      setAccessStatus(true);
      return;
    }
    if (isGuest) {
      setAccessStatus(false);
      return;
    }
    const res = await hasPaidContentStatus({
      contentType: 'vod',
      _id: previewContent._id,
    });
    if (res.ok && res.data) {
      setAccessStatus(res.data.data.canView);
    } else {
      ToastNotification('error', `${res.data?.message}`);
    }
  }, [contentType, isGuest, previewContent._id]);

  const handleShare = useCallback(() => {
    const shareUrl = buildShareUrl(
      previewContent.type || 'vod',
      previewContent._id,
    );
    Share.open({
      title: previewContent.title,
      subject: `Watch ${previewContent.title} on Reeplay`,
      message: `Watch “${previewContent.title}” on Reeplay.\n${shareUrl}`,
    })
      .then(res => {
        queueAnalyticsEvent({
          sessionId: analyticsId('share'),
          contentId: previewContent._id,
          contentType: 'vod',
          eventType: 'share',
          shareDestination:
            typeof res === 'object' && res && 'app' in res
              ? String(res.app).slice(0, 40)
              : 'system-share',
        });
        void flushAnalyticsEvents();
      })
      .catch(err => err && console.log(err));
  }, [previewContent._id, previewContent.title, previewContent.type]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    Orientation.lockToPortrait();
    handleContentStatusUpdate();
    handleVODRating();
    if (!isGuest) getWatchListStatus();
    getCommentCount();
    handleFetchVodMeta();
  }, [
    getCommentCount,
    getWatchListStatus,
    handleContentStatusUpdate,
    handleFetchVodMeta,
    handleVODRating,
    isFocused,
    isGuest,
  ]);

  useEffect(() => {
    if (!isFullscreen) {
      handleFetchVodMeta();
    }
  }, [handleFetchVodMeta, isFullscreen]);

  return {
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
  };
}
