import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../app.store';
import { OrientationType } from 'react-native-orientation-locker';
import { ICategoryData, IContinueWatching, ILiveContent, IPremiumContentCost, IVODContent } from '@/types/api/content.types';
import { UserCurrencyInfo } from '@/Hooks/useCurrencyByIP';
// import type { PayloadAction } from '@reduxjs/toolkit'

// Define a type for the slice state
interface BannerProps {
   banner: { lives: ILiveContent[];
    vods: IVODContent[]},
    category: ICategoryData[]
    genres: ICategoryData[]
    continueWatching: IContinueWatching[]
    premiumCost: IPremiumContentCost|null
    selectPremiumCost: UserCurrencyInfo|null
}

// Define the initial state using that type
const initialState: BannerProps = {
    banner: {
        lives: [],
    vods: [],
    },
    category:[],
    genres:[],
    continueWatching:[],
    premiumCost:null,
    selectPremiumCost:null

};

const bannerSlice = createSlice({
    name: 'banner',
    initialState,
    reducers: {
        setCategories: (state, action: PayloadAction<ICategoryData[]>) => {
  const list = Array.isArray(action.payload) ? action.payload : [];
  state.category = list.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
},
       setGenres: (state, action: PayloadAction<ICategoryData[]>) => {
  const list = Array.isArray(action.payload) ? action.payload : [];
  state.genres = list.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
},
        setContinueWatching: (state, action) =>{
            state.continueWatching = Array.isArray(action.payload) ? action.payload : [];
        },
        setBannerContent: (state, action) => {
            const payload = action.payload;
            state.banner = {
              lives: Array.isArray(payload?.lives) ? payload.lives : [],
              vods: Array.isArray(payload?.vods) ? payload.vods : [],
            };
        },
        setPremiumContentCost: (state, action) =>{
            state.premiumCost = action.payload
        },
        setSelectedPremiumCost: (state, action) =>{
            state.selectPremiumCost = action.payload
        },
removeContinueWatchingById: (state, action: PayloadAction<string>) => {
    state.continueWatching = state.continueWatching.filter(
      item => item.watchedDocumentId !== action.payload
    );
  },
    },
});

export const { setBannerContent,setPremiumContentCost,setSelectedPremiumCost, setCategories, setGenres, setContinueWatching, removeContinueWatchingById } = bannerSlice.actions;


export const selectBannerContent = (state: RootState) =>
    state.banner.banner;

export const selectCategories = (state: RootState) =>
    state.banner.category;
export const selectGenres = (state: RootState) =>
    state.banner.genres;

export const selectPremiumCost = (state: RootState) =>
    state.banner.premiumCost;

export const selectUserPremiumCost = (state: RootState) =>
    state.banner.selectPremiumCost;
export const selectContinueWatching = (state: RootState) =>
    state.banner.continueWatching;

export default bannerSlice.reducer;
