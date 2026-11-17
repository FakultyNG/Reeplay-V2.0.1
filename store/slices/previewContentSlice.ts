import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../app.store';
import { IVODContent } from '@/types/api/content.types';
import { IComment, IReply } from '@/types/api/comment.types';

// Define the initial state using that type
interface PreviewVODProps{
    content: IVODContent;
    comments: IComment[];
    replies: Record<string, IReply[]>
}

const EMPTY_ARRAY:[] = []

const initialState: PreviewVODProps = {
    content: {
     _id: '',
       adminId: '',
       primaryColor: '',
       title: '',
       subtitle: '',
       type: '',
       artistName: '',
       description: '',
       pg: '',
       genre: [],
       category: [],
       cast: [],
       likes: [],
       runtime: '',
       featured: false,
       createdAt: '',
       upcomingSubscribers: [],
       active:false,
       showViews:false,
       enagements: 0,
       landscapePhoto: '',
       portraitPhoto: '',
       viewsCount: 0,
       vidClass: '',
       releaseDate: '',
       expiryDate: '',
       defaultRating: 0,
       averageRating: 0,
       seasons: [],
       video: '',
       trailer: '',
},
comments:[],
replies:{}
};

const previewVODSlice = createSlice({
    name: 'previewVOD',
    initialState,
    reducers: {
        setPreviewContent: (state, action:PayloadAction<IVODContent>) => {
          const next = action.payload;
          if (!next || typeof next !== 'object') {
            return;
          }
          if (state.content._id !== next._id) {
            state.comments = [];
            state.replies = {};
          }
          state.content = {
            ...initialState.content,
            ...next,
            genre: Array.isArray(next.genre) ? next.genre : [],
            category: Array.isArray(next.category) ? next.category : [],
            cast: Array.isArray(next.cast) ? next.cast : [],
            likes: Array.isArray(next.likes) ? next.likes : [],
            upcomingSubscribers: Array.isArray(next.upcomingSubscribers)
              ? next.upcomingSubscribers
              : [],
            seasons: Array.isArray(next.seasons) ? next.seasons : [],
            title: next.title ?? '',
            type: next.type ?? '',
            artistName: next.artistName ?? '',
            vidClass: next.vidClass ?? '',
            trailer: next.trailer ?? '',
            video: next.video ?? '',
            portraitPhoto: next.portraitPhoto ?? '',
            landscapePhoto: next.landscapePhoto ?? '',
            description: next.description ?? '',
            primaryColor: next.primaryColor ?? '#333333',
          };
        },
        setContentComments:(state, action:PayloadAction<IComment[]>) =>{
          state.comments = action.payload
        },
        setRepliesByCommentId: (
      state,
      action: PayloadAction<{commentId: string; replies: IReply[]}>,
    ) => {
      const {commentId, replies} = action.payload;
      state.replies = {
        ...state.replies,
        [commentId]: replies,
      };
    },
    addReplyByCommentId: (
      state,
      action: PayloadAction<{commentId: string; reply: IReply}>,
    ) => {
      const {commentId, reply} = action.payload;
      const existing = state.replies[commentId] ?? [];

      const index = existing.findIndex(
        x => x.author.userDocumentId === reply.author.userDocumentId && x.content === reply.content,
      );

      let updated: IReply[];
      if (index !== -1) {
        updated = [...existing];
        updated[index] = reply;
      } else {
        updated = [reply, ...existing];
      }

      state.replies = {
        ...state.replies,
        [commentId]: updated,
      };
    },
    removeReplyById: (
      state,
      action: PayloadAction<{commentId: string; replyId: string}>,
    ) => {
      const {commentId, replyId} = action.payload;
      state.replies[commentId] = (state.replies[commentId] ?? []).filter(
        reply => reply._id !== replyId,
      );
    },
    addCommentReducers: (state, action: PayloadAction<IComment>) => {
      const newComment = action.payload;

      const index = state.comments.findIndex(comment => comment._id === newComment._id);

      if (index !== -1) {
        state.comments = [
          ...state.comments.slice(0, index),
          newComment,
          ...state.comments.slice(index + 1),
        ];
      } else {
        state.comments = [newComment, ...state.comments];
      }
    },
    removeCommentById: (state, action: PayloadAction<string>) => {
      state.comments = state.comments.filter(comment => comment._id !== action.payload);
      delete state.replies[action.payload];
    },
     updateCommentById: (state, action: PayloadAction<IComment>) => {
      const index = state.comments.findIndex(c => c._id === action.payload._id);
      if (index !== -1) {
        state.comments[index] = {
          ...action.payload,
        };
      }
    },

    updateRepliesByReplyId: (
      state,
      action: PayloadAction<{commentId: string; reply: IReply, replyId:string}>,
    ) => {
      const {commentId, reply, replyId} = action.payload;
      const existing = state.replies[commentId] ?? [];

      const index = existing.findIndex(r => r._id === replyId);
      if (index === -1) return;

      const updated = [...existing];
      updated[index] = reply;

      state.replies = {
        ...state.replies,
        [commentId]: updated,
      };
    },
    },
});

export const { setPreviewContent, setContentComments, updateCommentById, updateRepliesByReplyId, setRepliesByCommentId, addCommentReducers, addReplyByCommentId, removeCommentById, removeReplyById } = previewVODSlice.actions;


export const selectPreviewVODContent = (state: RootState) =>
    state.previewVODContent.content;

export const selectPreviewVODComments = (state: RootState) =>
    state.previewVODContent.comments;

export const selectRepliesByCommentId =
  (discussionId: string) => (state: RootState) => {
    return state.previewVODContent.replies[discussionId] ?? EMPTY_ARRAY;
  };

export default previewVODSlice.reducer;
