import {useCallback, useEffect, useState} from 'react';
import Share from 'react-native-share';
import {useIsFocused} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {
  selectPreviewVODContent,
  setContentComments,
  setPreviewContent,
} from '@/store/slices/previewContentSlice';
import ToastNotification from '@/components/ToastNotifications';
import {
  addWatchList,
  checkIsWatchList,
  removeWatchList,
} from '@/api/watchlist.api';
import {fetchCommentbyVOD, totalCommentCount} from '@/api/comment.api';
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

type Options = {
  isFullscreen: boolean;
  isComment: boolean;
  rating: number;
  setLoading_r: (v: boolean) => void;
};

export function usePreviewActions({
  isFullscreen,
  isComment,
  rating,
  setLoading_r,
}: Options) {
  const dispatch = useAppDispatch();
  const previewContent = useAppSelector(selectPreviewVODContent);
  const premiumCost = useAppSelector(selectUserPremiumCost);
  const isFocused = useIsFocused();

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
    if (res.ok && res.data?.data.totalComments) {
      setCommentCount(res.data.data.totalComments);
    }
  }, [previewContent._id]);

  const handleVODRating = useCallback(async () => {
    const res = await getVODRatings(previewContent._id);
    if (res.ok && res.data && res.data.data.totalStats.length > 0) {
      setVODRating(res.data.data);
    }
  }, [previewContent._id]);

  const handleAddRating = useCallback(async () => {
    try {
      setLoading_r(true);
      const res = await addVODRating({
        rate: rating,
        parentId: previewContent._id,
        parentType: 'vod',
      });
      if (res.ok && res.data) {
        ToastNotification('success', res.data.message);
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
  }, [
    handleFetchVodMeta,
    handleVODRating,
    previewContent._id,
    rating,
    setLoading_r,
  ]);

  const getWatchListStatus = useCallback(async () => {
    const res = await checkIsWatchList(previewContent._id);
    if (res.ok && res.data) {
      setAddWatchList(res.data.data.isListed);
    }
  }, [previewContent._id]);

  const handleAddWatchList = useCallback(async () => {
    try {
      setLoading(true);
      setAddWatchList(!addWatchList_boolean);
      const res = addWatchList_boolean
        ? await removeWatchList(previewContent._id)
        : await addWatchList(previewContent._id);
      if (res.ok && res.data) {
        ToastNotification('info', res.data.message);
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

  const handleFetchComments = useCallback(
    async (page?: number) => {
      const res = await fetchCommentbyVOD({
        vodId: previewContent._id,
        pagination: {page: page ?? 1, limit: 20},
      });
      if (res.ok && res.data) {
        dispatch(setContentComments(res.data.data));
      }
    },
    [dispatch, previewContent._id],
  );

  const handleContentStatusUpdate = useCallback(async () => {
    if (contentType === 'free') {
      setAccessStatus(true);
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
  }, [contentType, previewContent._id]);

  const handleShare = useCallback(() => {
    Share.open({message: 'share movie'})
      .then(res => console.log(res))
      .catch(err => err && console.log(err));
  }, []);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    Orientation.lockToPortrait();
    handleContentStatusUpdate();
    handleVODRating();
    getWatchListStatus();
    getCommentCount();
    handleFetchVodMeta();
  }, [isFocused]);

  useEffect(() => {
    handleFetchComments();
  }, [isComment]);

  useEffect(() => {
    if (!isFullscreen) {
      handleFetchVodMeta();
    }
  }, [isFullscreen]);

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
