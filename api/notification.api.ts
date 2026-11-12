import { IGeneric, IPagination } from "@/types/api/auth.types";
import { apiCall } from "./profile.api";
import { INotificationResponse, IRegisterDevice } from "@/types/api/notification.types";



export const getAllNotifications = async ({page, limit}:IPagination) =>
    await apiCall<INotificationResponse>(baseApi => baseApi.get<INotificationResponse>(`/customers/notifications?page=${page}&limit=${limit}`))


export const registerNotificationDevice = async (data:IRegisterDevice) =>
    await apiCall<IGeneric>(baseApi => baseApi.post<IGeneric>(`/customers/notification/device/update`, data))

export const deleteNotificationDevice = async (data:{token:string}) =>
    await apiCall<IGeneric>(baseApi => baseApi.delete<IGeneric>(`/customers/notification/device`, data))
