import { IGeneric } from "./auth.types";


export interface IBannerContentResponse extends IGeneric {
    data: {
        lives: ILiveContent[],
        vods: IVODContent[]
    }
}


export interface ILiveContent {
    _id: string;
    title: string;
    subTitle: string;
    location: string;
    channelLogo: string | null;
    pg: string;
    description: string
    active: boolean;
    expired: boolean
    type: string;
    start: string;
    expiry: string;
    sponsored: boolean;
    popular: boolean;
    upcoming: boolean;
    upcomingSubscribers: string[];
    featured: boolean;
    coverPhoto: string;
    engagements: number;
    viewsCount: number;
    streamKey: string;
    vidClass: string;
    clientId: string;
    previewVideo: string | null;
    createdAt: string
    updatedAt: string
    amount?: number,
    currency?: string
     voteInfo: IVoteInfo|null,
    stream_url:string;
    canView:boolean
}

export interface IVoteInfo{
        _id:string,
        price: number,
        currency:string,
        status: boolean,
    }


export interface IVODContent {
    _id: string;
    adminId: string;
    primaryColor: string;
    title: string;
    subtitle: string;
    type: string
    artistName?: string;
    description: string
    pg: string;
    genre: IGenre[]
    category: IGenre[];
    cast: ICast[];
    likes: [];
    runtime: string;
    featured: boolean;
    createdAt: string;
    upcomingSubscribers: string[];
    active:boolean;
    showViews:boolean;
    enagements: number
    landscapePhoto: string;
    portraitPhoto: string
    viewsCount: number;
    vidClass: string;
    releaseDate: string;
    expiryDate: string;
    defaultRating: number;
    averageRating: number;
    seasons: [];
    video: string;
    trailer: string;
    amount?: number,
    currency?: string
}

export interface IGenre {
    _id: string;
    name: string;
    position: number
}

export interface ICast {
    _id: string;
    title: string;
    link: string;
    selectButtonType: string;
    name: string;
    description: string;
    photoUrl: string;
}

export interface ICastsResponse extends IGeneric{
    data:ICast[]
}

export interface IVodMetaResponse extends IGeneric{
    data:{
        _id:string;
        viewsCount:number;
        averageRating:number
    }
}

export interface IAdsResponse extends IGeneric{
    data: IAdsData[]
}

export interface IAdsData{
    _id: string;
  title: string;
  type: string;
  brand: string;
  link: string;
  duration: number;
  start: string;
  expiry: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  photoUrl: string;
  videoUrl: string;
  cta: string;
}

export interface IEnumsResponse extends IGeneric{
    data: ICategoryData[],
}

export interface ICategoryData {
    _id: string,
    name: string,
    createdAt: string,
    updatedAt: string,
    position: number,
    feedType?: 'standard' | 'personalized'
}


export interface IContinueWatchingResponse extends IGeneric{
    data:  IContinueWatching[]
}

export interface IRegisteredContinueWatching{
    parentId:string;
    parentType:'vod'|'episode',
    duration:number,
    totalDuration:number
}

export interface IContinueWatching {
  parentType: string;
  parentId: string;
  duration: number;
  totalDuration: number;
  watchedDocumentId: string;
  video: IVODContent;
  episode?:IContinueWatchingEpisode
  season?:IContinueWatchingSeason
}

export interface IContinueWatchingSeason{
    _id:string;
    admin: string;
    video: string;
    serial_number: 1;
    description: string|null,
    commentsCount: number
}

export interface IContinueWatchingEpisode {
                _id: string;
                admin: string;
                season: string;
                episodeNumber: number;
                title: string;
                description: string;
                commentsCount: number;
                createdAt: string;
                updatedAt: string;
                viewsCount: string;
                averageRating:number;
                video: string|null;
                trailer: string|null
            }

export interface IVODbyEnumIDResponse extends IGeneric{
    data: IVODContent[]
}

export interface ISearchResponse extends IGeneric{
    data: {
        vods: IVODContent[];
        lives: ILiveContent[];
        items?: (IVODContent | ILiveContent)[]
    }
}

export interface ISearchMainResponse extends IGeneric{
    data: {
        vods: IVODContent[];
        events: ILiveContent[]
    }
}

export interface IRatingData{
    rate:number;
    parentType:'vod';
    parentId:string
}

export interface IReactionData{
    commentId:string;
    reaction:string
}

export interface IAddReactionResponse extends IGeneric{
    data:{
        reactionId:string
    }
}

export interface IDownloadData{
    _id:string
    title:string;
    pg:string;
    landscapePhoto: string;
    portraitPhoto: string
    video: string;
    /** Original network URL used when an offline download is cast to a TV. */
    castVideo?: string;
    size: string | null,
    desc:string;
    type:string;
    vidClass:string;
    viewsCount:number
    seekTo?:number
    watchedDocumentId?:string
    playlist?: IDownloadData[];
    playlistIndex?: number
    /** Distinguishes monetized full playback from trailers/previews. */
    playbackRole?: 'main' | 'trailer' | 'preview';
}

export interface IVODRatingResponse extends IGeneric{
    data:IVODRatings
}

export interface IVODRatings{
        totalStats: ITotalStats[]
        groupStats:IGroupStats[]
        myRating: {
            _id: string;
            rate: number;
        } | null
    }

interface ITotalStats{
    totalRatingsDocuments: number,
    averageRating: number
}

interface IGroupStats{
    count:number;
    rate:number
}


export interface IContentUserStatusResponse extends IGeneric{
    data:{
        canView:boolean
    }
}

export interface IPremiumContentCostResponse extends IGeneric{
    data: IPremiumContentCost
}

export interface IPremiumContentCost{
        premiumNGN: number,
        premiumUSD: number
    }

export interface ISeasonDataResponse extends IGeneric{
    data:ISeasonData[]
}

export interface ISeasonData {
  _id: string;
  admin: string;
  video: string;
  serial_number: number;
  description: string | null;
  commentsCount: number;
  episodes: IEpisode[];
  viewsCount: number;
}

export interface IEpisode {
  _id: string;
  admin: string;
  season: string;
  episodeNumber: number;
  title: string;
  description: string;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  viewsCount: number;
  averageRating: number;
  video?: string;
  videoUploadId?: string;
  trailer?: string;
  durationWatched?: number;
}

export interface IVodSubtitleResponse extends IGeneric{
    data: IVodSubtitle[]
}

export interface IVodSubtitle{
    _id:string;
    key:string;
    bucket:string;
    language:string;
    src:string
}

export interface IHomeAdData {
  _id: string;
  title: string;
  type: 'home_ad';
  link: string;
  active: boolean;
  photoUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface IHomeAdsResponse extends IGeneric {
  data: IHomeAdData[];
}

export interface IVodDetailsResponse extends IGeneric {
    data: IVODContent;
}
