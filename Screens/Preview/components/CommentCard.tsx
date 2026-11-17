import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import {addReaction, deleteReaction} from '@/api/content.api';
import {fetchRepliesbyCommentId} from '@/api/comment.api';
import {LikeBtn, LikeBtn_F, ReplyIcon} from '@/assets/icons';
import {AppImage, AppText, TouchableOpacity} from '@/components';
import ToastNotification from '@/components/ToastNotifications';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {
  selectRepliesByCommentId,
  setRepliesByCommentId,
} from '@/store/slices/previewContentSlice';
import {IComment, IReply, IReplyDetails} from '@/types/api/comment.types';
import {formatLikesNumber} from '@/Utils/formatAmount';
import {getTimeAgo} from '@/Utils/formatTime';
import {requireRegisteredUser} from '@/Utils/guestAccess';

interface Props {
  item: IComment;
  setRepliesDetails: React.Dispatch<React.SetStateAction<IReplyDetails | null>>;
}

const REPLY_PAGE_SIZE = 10;

const CommentCard = ({setRepliesDetails, item}: Props) => {
  const dispatch = useAppDispatch();
  const replies = useAppSelector(selectRepliesByCommentId(item._id));
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(item.totalReplies > 0);

  const fetchReplies = useCallback(
    async (nextPage: number, replace = false) => {
      if (loadingReplies || (!replace && !hasMore)) return;
      setLoadingReplies(true);
      setReplyError('');
      try {
        const response = await fetchRepliesbyCommentId({
          commentId: item._id,
          pagination: {page: nextPage, limit: REPLY_PAGE_SIZE},
        });
        if (!response.ok || !response.data) {
          throw new Error(response.data?.message || 'Unable to load replies');
        }

        const incoming = response.data.data;
        if (replace) {
          dispatch(setRepliesByCommentId({commentId: item._id, replies: incoming}));
        } else {
          const existingIds = new Set(replies.map(reply => reply._id));
          dispatch(
            setRepliesByCommentId({
              commentId: item._id,
              replies: [
                ...replies,
                ...incoming.filter(reply => !existingIds.has(reply._id)),
              ],
            }),
          );
        }
        setPage(nextPage);
        setHasMore(incoming.length === REPLY_PAGE_SIZE);
      } catch (caught) {
        setReplyError(caught instanceof Error ? caught.message : 'Unable to load replies');
      } finally {
        setLoadingReplies(false);
      }
    },
    [dispatch, hasMore, item._id, loadingReplies, replies],
  );

  const toggleReplies = () => {
    const nextVisible = !showReplies;
    setShowReplies(nextVisible);
    if (nextVisible && replies.length === 0 && item.totalReplies > 0) {
      void fetchReplies(1, true);
    }
  };

  const replyCount = Math.max(item.totalReplies || 0, replies.length);

  return (
    <View className="border-b border-[#29292E] py-4">
      <SingleCommentCard item={item} setRepliesDetails={setRepliesDetails} />

      {replyCount > 0 && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={toggleReplies}
          className="ml-[47px] mt-3 self-start rounded-full bg-[#222226] px-3 py-2">
          <AppText className="text-xs font-ROBOTO_500 text-grey_200">
            {showReplies ? 'Hide replies' : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
          </AppText>
        </TouchableOpacity>
      )}

      {showReplies && (
        <View className="ml-[34px] mt-2 border-l border-[#34343A] pl-3">
          {replies.map(reply => (
            <View key={reply._id} className="py-3">
              <SingleCommentCard
                item={reply}
                isReply
                setRepliesDetails={setRepliesDetails}
              />
            </View>
          ))}

          {loadingReplies && (
            <ActivityIndicator color="#FF1313" style={{marginVertical: 12}} />
          )}

          {!!replyError && !loadingReplies && (
            <TouchableOpacity
              className="self-start py-2"
              onPress={() => fetchReplies(replies.length ? page + 1 : 1, replies.length === 0)}>
              <AppText className="text-xs text-red">Retry loading replies</AppText>
            </TouchableOpacity>
          )}

          {hasMore && replies.length >= REPLY_PAGE_SIZE && !loadingReplies && (
            <TouchableOpacity
              className="self-start py-2"
              onPress={() => fetchReplies(page + 1)}>
              <AppText className="text-xs font-ROBOTO_500 text-white">Load more replies</AppText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default CommentCard;

interface SingleCommentCardProps {
  item: IComment | IReply;
  isReply?: boolean;
  setRepliesDetails: React.Dispatch<React.SetStateAction<IReplyDetails | null>>;
}

const SingleCommentCard = ({item, isReply, setRepliesDetails}: SingleCommentCardProps) => {
  const [isLiked, setIsLiked] = useState(Boolean(item.reactionId));
  const [reactionCount, setReactionCount] = useState(item.totalReactions || 0);
  const [reactionId, setReactionId] = useState<string | null>(item.reactionId);
  const [savingReaction, setSavingReaction] = useState(false);
  const image = item.author.photoURL;

  useEffect(() => {
    setIsLiked(Boolean(item.reactionId));
    setReactionId(item.reactionId);
    setReactionCount(item.totalReactions || 0);
  }, [item._id, item.reactionId, item.totalReactions]);

  const reply = () => {
    if (!requireRegisteredUser() || item.loading) return;
    setRepliesDetails({
      name: item.author.fullName,
      commentId:
        'parentCommentId' in item && item.parentCommentId
          ? item.parentCommentId
          : item._id,
      ...(isReply ? {replyId: item._id} : {}),
    });
  };

  const toggleReaction = async () => {
    if (!requireRegisteredUser() || item.loading || savingReaction) return;
    const previousLiked = isLiked;
    const previousCount = reactionCount;
    const previousReactionId = reactionId;

    setSavingReaction(true);
    setIsLiked(!previousLiked);
    setReactionCount(Math.max(0, previousCount + (previousLiked ? -1 : 1)));

    try {
      if (!previousLiked) {
        const response = await addReaction({reaction: 'love', commentId: item._id});
        if (!response.ok || !response.data) throw new Error('Unable to like comment');
        setReactionId(response.data.data.reactionId);
      } else {
        if (!previousReactionId) throw new Error('Reaction is unavailable');
        const response = await deleteReaction({reactionId: previousReactionId});
        if (!response.ok) throw new Error(response.data?.message || 'Unable to remove like');
        setReactionId(null);
      }
    } catch (caught) {
      setIsLiked(previousLiked);
      setReactionCount(previousCount);
      setReactionId(previousReactionId);
      ToastNotification(
        'error',
        caught instanceof Error ? caught.message : 'Unable to update reaction',
      );
    } finally {
      setSavingReaction(false);
    }
  };

  return (
    <View className="flex-row">
      <AppImage
        style={{width: 37, height: 37, borderRadius: 19, marginRight: 10}}
        source={
          image
            ? {uri: image, priority: FastImage.priority.high}
            : require('@/assets/images/default-user-profile.webp')
        }
      />

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center">
          <AppText numberOfLines={1} className="max-w-[65%] text-[13px] font-ROBOTO_700 text-white">
            {item.author.fullName || 'Reeplay user'}
          </AppText>
          <View className="mx-2 h-1 w-1 rounded-full bg-[#67676D]" />
          <AppText className="text-[11px] font-ROBOTO_400 text-grey_200">
            {getTimeAgo(item.updatedAt)}
          </AppText>
        </View>

        {'parentCommentAuthor' in item && item.parentCommentAuthor?.fullName ? (
          <AppText className="mt-1 text-[11px] text-grey_200">
            Replying to @{item.parentCommentAuthor.fullName}
          </AppText>
        ) : null}

        <AppText className="mt-1.5 text-[14px] leading-5 font-ROBOTO_400 text-[#E8E8EA]">
          {item.content}
        </AppText>

        <View className="mt-2.5 flex-row items-center gap-x-5">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isLiked ? 'Unlike comment' : 'Like comment'}
            disabled={item.loading || savingReaction}
            hitSlop={10}
            onPress={toggleReaction}
            className="flex-row items-center gap-x-1.5">
            {isLiked ? <LikeBtn_F /> : <LikeBtn />}
            {reactionCount > 0 && (
              <AppText className="text-xs text-grey_200">
                {formatLikesNumber(reactionCount)}
              </AppText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Reply to comment"
            disabled={item.loading}
            hitSlop={10}
            onPress={reply}
            className="flex-row items-center gap-x-1.5">
            <ReplyIcon />
            <AppText className="text-xs font-ROBOTO_500 text-grey_200">Reply</AppText>
          </TouchableOpacity>

          {item.loading && (
            <AppText className="text-[11px] text-grey_200">Sending…</AppText>
          )}
        </View>
      </View>
    </View>
  );
};
