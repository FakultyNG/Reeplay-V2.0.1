import {PayloadAction, createSelector, createSlice} from '@reduxjs/toolkit';
import {RootState} from '../app.store';
import {IProfile} from '@/types/api/profile.types';
import { WalletDetails } from '@/types/api/payment.type';
import { IVODContent } from '@/types/api/content.types';
import { INotification } from '@/types/api/notification.types';
// import type { PayloadAction } from '@reduxjs/toolkit'

interface IProfileSlice{
  userInfo:IProfile;
  walletInfo:WalletDetails|null
  watchList: IVODContent[]
  notifications:INotification[]
  hideTabBar:boolean
}

// Define the initial state using that type
const initialState: IProfileSlice = {
 userInfo:{ 
  profile: {
    _id: '',
    country_code: '',
    email: '',
    first_name: '',
    last_name: '',
    mobile: '',
    role: '',
    createdAt: '',
    paymentDetails: null,
    settings_info: {
      allow_notifications: false,
      new_services: false,
      upcoming_events: false,
      new_arrivals: false,
      live_channels: false,
      video_quality: '',
      watchlist: [],
      _id: '',
      user_id: '',
      interest: [],
      interest_genres: [],
      interest_categories: [],
    },
  },
  photo_url: '',
},
walletInfo:null,
watchList:[],
notifications:[],
hideTabBar:false
};

const userSlice = createSlice({
  name: 'user',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<IProfile | null | undefined>) => {
      const payload = action.payload;
      if (!payload || typeof payload !== 'object') {
        return;
      }
      // Normalize older/alternate API shapes that put name fields at the root.
      if (!payload.profile || typeof payload.profile !== 'object') {
        const root = payload as unknown as Record<string, unknown>;
        state.userInfo = {
          photo_url:
            typeof root.photo_url === 'string' ? root.photo_url : state.userInfo.photo_url,
          profile: {
            ...state.userInfo.profile,
            ...(root as Partial<IProfile['profile']>),
          },
        };
        return;
      }
      state.userInfo = {
        photo_url: payload.photo_url ?? '',
        profile: {
          ...state.userInfo.profile,
          ...payload.profile,
          settings_info: {
            ...state.userInfo.profile.settings_info,
            ...(payload.profile.settings_info ?? {}),
          },
        },
      };
    },
    setCredentialsEmail: (state, action) => {
      state.userInfo.profile.email = action.payload;
    },
    setWalletInfo: (state, action) => {
      state.walletInfo = action.payload;
    },
    setWatchListContents: (state, action:PayloadAction<IVODContent[]>) => {
      state.watchList = Array.isArray(action.payload) ? action.payload : [];
    },
    deleteWatchlistById: (state, action:PayloadAction<string>) => {
    const idToDelete = action.payload;
    state.watchList = state.watchList.filter(item => item._id !== idToDelete);
},
    clearWatchlist: state => {
    state.watchList = []
},
    setNoticationsList: (state, action: PayloadAction<INotification[]>) => {
      state.notifications = action.payload;
    },
    updateNotificationById: (
      state,
      action: PayloadAction<{id: string; data: Partial<INotification>}>,
    ) => {
      const index = state.notifications.findIndex(n => n._id === action.payload.id);
      if (index !== -1) {
        state.notifications[index] = {...state.notifications[index], ...action.payload.data};
      }
    },
    logout: () => {
      return initialState;
    },
    setHideTabBar: (state, action) => {
      state.hideTabBar = action.payload;
    },
  },
});

export const {setCredentials, setHideTabBar, deleteWatchlistById, clearWatchlist, setNoticationsList, updateNotificationById, setWatchListContents, setWalletInfo, setCredentialsEmail, logout} = userSlice.actions;
// Other code such as selectors can use the imported `RootState` type
export const selectUser = (state: RootState) =>
  state.user?.userInfo?.profile ?? initialState.userInfo.profile;
export const selectUserProfilePic = (state: RootState) =>
  state.user?.userInfo?.photo_url ?? '';
export const selectWalletInfo = (state: RootState) => state.user.walletInfo;
export const selectWatchListContents = (state: RootState) =>
  Array.isArray(state.user.watchList) ? state.user.watchList : [];
export const selectNotificationList = (state: RootState) =>
  Array.isArray(state.user.notifications) ? state.user.notifications : [];
export const selectHideTabBar = (state: RootState) => state.user.hideTabBar;

export const selectHasUnviewedNotifications = createSelector(
  [selectNotificationList],
  notifications => notifications.some(n => n.hasSeen === false),
);

export const selectGroupedNotifications = createSelector(
  [selectNotificationList],
  (notifications): Record<string, INotification[]> => {
    return notifications.reduce((acc, item) => {
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, INotification[]>);
  },
);

export default userSlice.reducer;
