import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, RefreshControl, View} from 'react-native';
import {fetchCommentbyVOD} from '@/api/comment.api';
import {AppText, TouchableOpacity} from '@/components';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {
  selectPreviewVODComments,
  setContentComments,
} from '@/store/slices/previewContentSlice';
import {IReplyDetails} from '@/types/api/comment.types';
import CommentCard from './components/CommentCard';

const PAGE_SIZE = 20;

interface Props {
  setRepliesDetails: React.Dispatch<React.SetStateAction<IReplyDetails | null>>;
  vodId: string;
  loadComment: boolean;
}

const PreviewComments = ({setRepliesDetails, vodId, loadComment}: Props) => {
  const dispatch = useAppDispatch();
  const comments = useAppSelector(selectPreviewVODComments);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      if ((!replace && !hasMore) || (loading && !replace)) return;
      setError('');
      if (!replace) setLoading(true);

      try {
        const response = await fetchCommentbyVOD({
          vodId,
          pagination: {page: nextPage, limit: PAGE_SIZE},
        });
        if (!response.ok || !response.data) {
          throw new Error(response.data?.message || 'Unable to load comments');
        }

        const incoming = response.data.data;
        if (replace) {
          dispatch(setContentComments(incoming));
        } else {
          const existingIds = new Set(comments.map(comment => comment._id));
          dispatch(
            setContentComments([
              ...comments,
              ...incoming.filter(comment => !existingIds.has(comment._id)),
            ]),
          );
        }
        setPage(nextPage);
        setHasMore(incoming.length === PAGE_SIZE);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load comments');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [comments, dispatch, hasMore, loading, vodId],
  );

  useEffect(() => {
    dispatch(setContentComments([]));
    setPage(1);
    setHasMore(true);
    setLoading(true);
    void fetchPage(1, true);
    // Optimistic list changes should not trigger another page-one request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, vodId]);

  const refresh = () => {
    setRefreshing(true);
    setHasMore(true);
    void fetchPage(1, true);
  };

  const emptyState = loading ? (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <ActivityIndicator color="#FF1313" />
      <AppText className="mt-3 text-sm text-grey_200">Loading comments…</AppText>
    </View>
  ) : error ? (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <AppText className="text-center text-base font-ROBOTO_500 text-white">
        Comments couldn’t load
      </AppText>
      <AppText className="mt-2 text-center text-sm text-grey_200">{error}</AppText>
      <TouchableOpacity
        className="mt-5 rounded-full bg-red px-6 py-3"
        onPress={() => fetchPage(1, true)}>
        <AppText className="font-ROBOTO_500 text-white">Try again</AppText>
      </TouchableOpacity>
    </View>
  ) : (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <AppText className="text-base font-ROBOTO_500 text-white">No comments yet</AppText>
      <AppText className="mt-2 text-center text-sm text-grey_200">
        Start the conversation and share what you think.
      </AppText>
    </View>
  );

  return (
    <FlatList
      keyboardShouldPersistTaps="handled"
      data={comments}
      keyExtractor={item => item._id}
      renderItem={({item}) => (
        <CommentCard item={item} setRepliesDetails={setRepliesDetails} />
      )}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 24,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor="#FF1313"
          colors={['#FF1313']}
        />
      }
      onEndReached={() => {
        if (!loading && hasMore && comments.length >= PAGE_SIZE) {
          void fetchPage(page + 1);
        }
      }}
      onEndReachedThreshold={0.35}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      updateCellsBatchingPeriod={40}
      windowSize={7}
      removeClippedSubviews
      ListEmptyComponent={emptyState}
      ListFooterComponent={
        loading && comments.length > 0 ? (
          <ActivityIndicator color="#FF1313" style={{marginVertical: 20}} />
        ) : null
      }
      extraData={loadComment}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default PreviewComments;
