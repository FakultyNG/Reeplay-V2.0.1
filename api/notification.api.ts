import { IGeneric, IPagination } from "@/types/api/auth.types";
import { apiCall } from "./profile.api";
import { INotificationResponse, IRegisterDevice, IUnreadNotificationCountResponse } from "@/types/api/notification.types";



export const getAllNotifications = async ({page, limit}:IPagination) =>
    await apiCall<INotificationResponse>(baseApi => baseApi.get<INotificationResponse>(`/customers/notifications?page=${page}&limit=${limit}`))

export const getUnreadNotificationCount = async () =>
    await apiCall<IUnreadNotificationCountResponse>(baseApi =>
        baseApi.get<IUnreadNotificationCountResponse>('/customers/notifications/unread-count'))


export const registerNotificationDevice = async (data:IRegisterDevice) =>
    await apiCall<IGeneric>(baseApi => baseApi.post<IGeneric>(`/customers/notification/device/update`, data))

export const deleteNotificationDevice = async (data:{fcmToken:string}) =>
    await apiCall<IGeneric>(baseApi => baseApi.delete<IGeneric>(`/customers/notification/device/remove`, data))

export const markNotificationSeen = async (notificationId:string) =>
    await apiCall<IGeneric>(baseApi => baseApi.put<IGeneric>(`/customers/notifications`, {
        notificationId,
        hasSeenStatus: true,
    }))

export const setNotificationSeen = async (notificationId:string, hasSeenStatus:boolean) =>
    await apiCall<IGeneric>(baseApi => baseApi.put<IGeneric>(`/customers/notifications`, {
        notificationId,
        hasSeenStatus,
    }))

export const markAllNotificationsSeen = async () =>
    await apiCall<IGeneric>(baseApi =>
        baseApi.put<IGeneric>('/customers/notifications/mark-all-read'))

export const deleteNotification = async (notificationId:string) =>
    await apiCall<IGeneric>(baseApi =>
        baseApi.delete<IGeneric>(`/customers/notifications/${notificationId}`))

export const clearAllNotifications = async () =>
    await apiCall<IGeneric>(baseApi =>
        baseApi.delete<IGeneric>('/customers/notifications/clear'))
