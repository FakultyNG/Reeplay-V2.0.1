import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../app.store';
import { IAdsData, IHomeAdData } from '@/types/api/content.types';
// import type { PayloadAction } from '@reduxjs/toolkit'

// Define a type for the slice state
interface AdsSliceProps {
    ads: IAdsData[];
    homeAds: IHomeAdData[];
}

// Define the initial state using that type
const initialState: AdsSliceProps = {
    ads:[],
    homeAds:[],
};

const adsSlice = createSlice({
    name: 'ads',
    initialState,
    reducers: {
        setAdsContent: (state, action) => {
            state.ads = action.payload;
        },
        setHomeAdsContent: (state, action) => {
            state.homeAds = action.payload;
        },
    },
});

export const { setAdsContent, setHomeAdsContent } = adsSlice.actions;


export const selectAdsContent = (state: RootState) =>
    state.ads;

export const selectHomeAds = (state: RootState) =>
    state.ads.homeAds;

export default adsSlice.reducer;
