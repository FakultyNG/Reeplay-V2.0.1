import {addComment, addReplyToComment} from '@/api/comment.api';
import ToastNotification from "@/components/ToastNotifications";
import { useAppDispatch, useAppSelector } from "@/Hooks/reduxHook";
import {
  addCommentReducers,
  addReplyByCommentId,
  removeCommentById,
  removeReplyById,
} from '@/store/slices/previewContentSlice';
import { selectUser, selectUserProfilePic } from "@/store/slices/userSlice";
import {IComment, ICommentData, IReply, IReplyData} from '@/types/api/comment.types';
import {useState} from 'react';
import {requireRegisteredUser} from '@/Utils/guestAccess';

interface Props{
    text:string
    vodId:string
    parentCommentId?:string
    parentReplyId?:string
    reply?:boolean
    resetFunc:() => void
    handleFinalFunc:() => void
}

export const useCommentHook = ({reply, resetFunc, handleFinalFunc, text, vodId, parentReplyId, parentCommentId}:Props) =>{
    const user = useAppSelector(selectUser)
    const userProfilePic = useAppSelector(selectUserProfilePic)
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState<boolean>(false);

    const addCommentFunc = async () => {
    if (!requireRegisteredUser()) return;
    const message = text.trim();
    if (!message || loading) return;

    const comment: ICommentData = {
      message,
      parentType:'vod',
      parentId: vodId
    };
    const replyComment: IReplyData = {
      message,
      parentType:'vod',
      parentId: vodId,
      parentCommentId:parentCommentId??'',
      ...(parentReplyId ? {parentReplyId} : {}),
    };

    const temporaryId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const data:IComment = {
      _id: temporaryId,
      content: message,
      createdAt: `${new Date().toISOString()}`,
      updatedAt: `${new Date().toISOString()}`,
      totalReactions:0,
      reactionId:null,
      totalReplies:0,
      authorPhotoURL: userProfilePic,
      author: {
        userDocumentId: user._id,
        fullName: `${user.first_name} ${user.last_name}`,
        photoURL:userProfilePic
      },
      loading: true,
    };

    if (!reply) dispatch(addCommentReducers(data));

    if (reply && parentCommentId) {
      dispatch(
        addReplyByCommentId({
          commentId: parentCommentId,
          reply: {
            ...data,
           parentCommentAuthor:{
            fullName:'',
            photoURL:'',
            userDocumentId:''
           },
           parentCommentId,
          } as IReply,
        }),
      );
    }


    try {
      setLoading(true);
      const response = reply
          ? await addReplyToComment(replyComment)
          : await addComment(comment);
      if (!response.ok || !response.data) {
        throw new Error(response.data?.message || 'Unable to post comment');
      }

      dispatch(
          (reply && parentCommentId)
            ? addReplyByCommentId({
                commentId: parentCommentId,
                reply: {
                ...data,
                _id: response.data.data._id,
                loading:false,
                parentCommentAuthor:{
                  fullName:'',
                  photoURL:'',
                  userDocumentId:''
                },
                parentCommentId,
              } as IReply,
           })
          : addCommentReducers({...data, _id: response.data.data._id, loading: false}),
        );
      if (reply && parentCommentId) {
        dispatch(removeReplyById({commentId: parentCommentId, replyId: temporaryId}));
      } else {
        dispatch(removeCommentById(temporaryId));
      }
      resetFunc();
      handleFinalFunc();
    } catch (error) {
      if (reply && parentCommentId) {
        dispatch(removeReplyById({commentId: parentCommentId, replyId: temporaryId}));
      } else {
        dispatch(removeCommentById(temporaryId));
      }
      ToastNotification(
        'error',
        error instanceof Error ? error.message : 'Unable to post comment. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return{
    addCommentFunc,
    loading
  }
}
