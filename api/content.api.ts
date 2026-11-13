import { IGeneric, IPagination } from "@/types/api/auth.types";
import { apiCall, getAuthToken } from "./profile.api";
import { IAddReactionResponse, IAdsResponse, IBannerContentResponse, ICastsResponse, IContentUserStatusResponse, IContinueWatchingResponse, IEnumsResponse, IPremiumContentCostResponse, IRatingData, IReactionData, IRegisteredContinueWatching, ISearchMainResponse, ISearchResponse, ISeasonDataResponse, IVODbyEnumIDResponse, IVodMetaResponse, IVODRatingResponse, IVodSubtitleResponse } from "@/types/api/content.types";
import {ApiResponse, create} from 'apisauce';
import {BASE_URL} from '@env';

const publishingCatalogApi = create({
    baseURL: BASE_URL,
    headers: {'Content-Type': 'application/json'},
    timeout: 12000,
});

async function publishingCatalogGet<T>(path: string) {
    const token = await getAuthToken();
    return publishingCatalogApi.get<T>(
        path,
        undefined,
        token ? {headers: {'customer-auth': token}} : undefined,
    );
}

function dedupeById<T extends {_id: string}>(items: T[]): T[] {
    return Array.from(new Map(items.map(item => [item._id, item])).values());
}

function mergeArrayResponses<
    T extends {_id: string},
    R extends IGeneric & {data: T[]},
>(primary: ApiResponse<R>, publishing: ApiResponse<R>): ApiResponse<R> {
    if (!primary.ok || !primary.data) {
        return publishing.ok && publishing.data ? publishing : primary;
    }
    if (publishing.ok && publishing.data) {
        primary.data.data = dedupeById([
            ...primary.data.data,
            ...publishing.data.data,
        ]);
    }
    return primary;
}

async function getMergedVodList(path: string) {
    const [primary, publishing] = await Promise.all([
        apiCall<IVODbyEnumIDResponse>(api =>
            api.get<IVODbyEnumIDResponse>(path),
        ),
        publishingCatalogGet<IVODbyEnumIDResponse>(path),
    ]);
    return mergeArrayResponses(primary, publishing);
}

export const bannerApi = async () => {
    const path = '/customers/banner/contents';
    const [primary, publishing] = await Promise.all([
        apiCall<IBannerContentResponse>(api =>
            api.get<IBannerContentResponse>(path),
        ),
        publishingCatalogGet<IBannerContentResponse>(path),
    ]);

    if (!primary.ok || !primary.data) {
        return publishing.ok && publishing.data ? publishing : primary;
    }
    if (publishing.ok && publishing.data) {
        primary.data.data.vods = dedupeById([
            ...primary.data.data.vods,
            ...publishing.data.data.vods,
        ]);
        primary.data.data.lives = dedupeById([
            ...primary.data.data.lives,
            ...publishing.data.data.lives,
        ]);
    }
    return primary;
};

export const randomAds = async () =>
    await apiCall<IAdsResponse>(baseApi => baseApi.get<IAdsResponse>('/customers/ads/random'))

export const fetchEnums = async (enumType:string) => {
    const path = `/customers/enums/shared/get-${enumType}?page=1&limit=1000`;
    const [primary, publishing] = await Promise.all([
        apiCall<IEnumsResponse>(api => api.get<IEnumsResponse>(path)),
        publishingCatalogGet<IEnumsResponse>(path),
    ]);
    return mergeArrayResponses(primary, publishing);
}

export const getContinueWatching = async (data?: IPagination) =>
    await apiCall<IContinueWatchingResponse>(baseApi => baseApi.get<IContinueWatchingResponse>(`/customers/watched/continue-watching${data ? `?page=${data.page}&limit=${data.limit}`:''}`))

export const registerContinueWatching = async (data?: IRegisteredContinueWatching) =>
    await apiCall<IGeneric>(baseApi => baseApi.post<IGeneric>(`/customers/watched/register`, data))

export const deleteContinueWatchingById = async (_id:string) =>
    await apiCall<IGeneric>(baseApi => baseApi.delete<IGeneric>(`/customers/watched/${_id}`))

export const getVODbyEnumID = async ({pagination, enumId}:{pagination?: IPagination, enumId:string}) =>
    await getMergedVodList(`/customers/shared/vods/category/${enumId}${pagination ? `?page=${pagination.page}&limit=${pagination.limit}`:''}`)

export const getVODbyGenreID = async ({pagination, enumId, vodId}:{pagination: IPagination, enumId:string, vodId?:string}) =>
    await getMergedVodList(`/customers/shared/vods/similar-by-genre/${enumId}?page=${pagination.page}&limit=${pagination.limit}${vodId ?`&vodId=${vodId}`:''}`)

export const getVODbyCastID = async ({pagination, enumId, vodId}:{pagination: IPagination, enumId:string, vodId?:string}) =>
    await getMergedVodList(`/customers/shared/vods/similar-by-cast/${enumId}?page=${pagination.page}&limit=${pagination.limit}${vodId ?`&vodId=${vodId}`:''}`)

export const recentSearches = async () =>
    await apiCall<ISearchResponse>(baseApi => baseApi.get<ISearchResponse>(`/customers/recent-search/fetch`))

export const fetchContentSuggestions = async () =>
    await apiCall<ISearchResponse>(baseApi => baseApi.get<ISearchResponse>(`/customers/shared/vods/suggestions`))

export const registerRecentSearch = async (data:{contentId:string, contentType:string}) =>
    await apiCall<IGeneric>(baseApi => baseApi.post<IGeneric>(`/customers/recent-search/register`, data))

export const searchContent = async (text:string) => {
    const path = `/customers/shared/featured/contents/search/${encodeURIComponent(text)}`;
    const [primary, publishing] = await Promise.all([
        apiCall<ISearchMainResponse>(api => api.get<ISearchMainResponse>(path)),
        publishingCatalogGet<ISearchMainResponse>(path),
    ]);

    if (!primary.ok || !primary.data) {
        return publishing.ok && publishing.data ? publishing : primary;
    }
    if (publishing.ok && publishing.data) {
        primary.data.data.vods = dedupeById([
            ...primary.data.data.vods,
            ...publishing.data.data.vods,
        ]);
        primary.data.data.events = dedupeById([
            ...primary.data.data.events,
            ...publishing.data.data.events,
        ]);
    }
    return primary;
}

export const libraryContent = async (data:{catId:string, genreId:string, pagination:IPagination}) =>
    await getMergedVodList(`/customers/shared/vods/categ-and-genre/${data.genreId}/${data.catId}?page=${data.pagination.page}&limit=${data.pagination.limit}`)

export const getVODRatings = async (vodId:string) =>
    await apiCall<IVODRatingResponse>(baseApi => baseApi.get<IVODRatingResponse>(`/customers/ratings/fetch/${vodId}`))

export const addVODRating = async (data:IRatingData) =>
    await apiCall<IGeneric>(baseApi => baseApi.post<IGeneric>(`/customers/ratings/create`, data))

export const addReaction = async (data:IReactionData) =>
    await apiCall<IAddReactionResponse>(baseApi => baseApi.put<IAddReactionResponse>(`/customers/socials/create-update/reaction/${data.commentId}/${data.reaction}`))

export const deleteReaction = async (data:{reactionId:string}) =>
    await apiCall<IGeneric>(baseApi => baseApi.delete<IGeneric>(`/customers/socials/delete/reaction/${data.reactionId}`))

export const hasPaidContentStatus = async (data:{contentType:'live'|'vod', _id:string}) =>
    await apiCall<IContentUserStatusResponse>(baseApi => baseApi.get<IContentUserStatusResponse>(`/customers/shared/check-content-payment/${data.contentType}/${data._id}`))

export const contentCostApi = async () =>
    await apiCall<IPremiumContentCostResponse>(baseApi => baseApi.get<IPremiumContentCostResponse>(`/customers/shared/content-costs`))

export const fetchSeasonsForSeries = async ({pagination,_id}:{pagination:IPagination, _id:string}) =>
    await apiCall<ISeasonDataResponse>(baseApi => baseApi.get<ISeasonDataResponse>(`/customers/shared/vods/seasons/${_id}?page=${pagination.page}&limit=${pagination.limit}`))

export const fetchCastsByVOID = async ({pagination,_id}:{pagination:IPagination, _id:string}) =>
    await apiCall<ICastsResponse>(baseApi => baseApi.get<ICastsResponse>(`/customers/shared/get-casts?vodId=${_id}&page=${pagination.page}&limit=${pagination.limit}`))

export const fetchVODDetails = async ({_id}:{_id:string}) =>
    await apiCall<IVodMetaResponse>(baseApi => baseApi.get<IVodMetaResponse>(`/customers/shared/vods/vod-meta/${_id}`))

export const getDefaultLibrary = async ({pagination}:{pagination:IPagination}) =>
    await getMergedVodList(`/customers/shared/vods/default-library?page=${pagination.page}&limit=${pagination.limit}`)

export const updateViewsCount = async (data:{content:string,contentType:'vod'}) =>
    await apiCall<IGeneric>(baseApi => baseApi.post<IGeneric>(`/customers/view/content`, data))

export const getSubtitles = async (data:{parentId:string}) =>
    await apiCall<IVodSubtitleResponse>(baseApi => baseApi.get<IVodSubtitleResponse>(`/customers/shared/subtitles/fetch/${data.parentId}`))

