import { ICheckWatchListResponse, IWatchListResponse } from "@/types/api/watchList.types";
import { apiCall } from "./profile.api";
import { IGeneric, IPagination } from "@/types/api/auth.types";


export const fetchWatchList = async (pagination: IPagination) =>
    await apiCall<IWatchListResponse>(baseApi => baseApi.get<IWatchListResponse>(`/customers/vod-waitlist?page=${pagination.page}&limit=${pagination.limit}`))

export const addWatchList = async (_id: string) =>
    await apiCall<IGeneric>(baseApi => baseApi.post<IGeneric>(`/customers/vod-waitlist/${_id}`))

export const removeWatchList = async (_id: string) =>
    await apiCall<IGeneric>(baseApi => baseApi.delete<IGeneric>(`/customers/vod-waitlist/${_id}`))

export const clearWatchList = async () =>
    await apiCall<IGeneric>(baseApi => baseApi.delete<IGeneric>(`/customers/vod-waitlist`))

export const checkIsWatchList = async (_id: string) =>
    await apiCall<ICheckWatchListResponse>(baseApi => baseApi.get<ICheckWatchListResponse>(`/customers/vod-waitlist/${_id}`))