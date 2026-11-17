import { IGeneric } from "./auth.types";

export interface INotificationResponse extends IGeneric{
    data:INotification[]
}

export interface IUnreadNotificationCountResponse extends IGeneric {
  data: {count: number};
}

export interface INotification {
  _id: string;
  adminNotification: AdminNotification;
  publisher: string;
  user: string;
  hasSeen: boolean;
  createdAt: string;
  updatedAt: string;
  photoUri: null | string;
}


interface AdminNotification {
  _id: string;
  admin: string;
  title: string;
  description: string;
  type?: string;
  metadata?: Record<string, unknown>;
  photo?: Photo;
  createdAt: string;
  updatedAt: string;
}


interface Photo {
  Bucket: string;
  Key: string;
}

export interface IRegisterDevice{
  device_token:string;
  device_id:string;
  device_type:string
}
