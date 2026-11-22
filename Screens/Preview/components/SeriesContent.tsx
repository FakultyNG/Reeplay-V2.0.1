import {ActivityIndicator, SectionList, Text, View} from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {AppImage, AppText, AppView, TouchableOpacity} from '@/components';
import {
  MiniPlayBtn,
  OpenDropDwn,
  PreviewDownloadIcon,
} from '@/assets/icons';
import LockWhite from '@/assets/icons/lock-white.svg'
import { IDownloadData, IEpisode, ISeasonData, IVODContent } from '@/types/api/content.types';
import { fetchSeasonsForSeries } from '@/api/content.api';
import ToastNotification from '@/components/ToastNotifications';
import { getRemoteFileSize } from '@/api/external.api';
import { downloadAndSave, encryptFile, getAESKeys } from '../utils/downloadUtils';
import RNFS from 'react-native-fs';
import DownloadedCompleteIcon from '@/assets/icons/Download.svg';
import { fetchDownloadSource } from '@/api/content.api';
import {useAppPersistStore} from '@/store/zustand.store';
import {
  getEpisodePlaybackUrl,
  normalizeSeriesSeasons,
} from '@/Utils/seriesContent';

const SERIES_PAGE_SIZE = 10;

interface Props{
 vod:IVODContent
 accessStatus: boolean
 setFullscreenContent: React.Dispatch<React.SetStateAction<IDownloadData | null>>
 makeFullscreen: () => void
}

const SeriesContent = ({vod, accessStatus, setFullscreenContent, makeFullscreen}:Props) => {
      const [seasons, setSeasons]= useState<ISeasonData[]>([]);
      const [page, setPage] = useState<number>(1);
      const [hasMore, setHasMore] = useState<boolean>(true);
      const [loading, setLoading] = useState<boolean>(false);
      const [collapsedSections, setCollapsedSections] = useState(new Set());

      const handleGetSeasons = useCallback(async (requestedPage?: number, replace = false) => {
      try {
        setLoading(true);
        const res = await fetchSeasonsForSeries({_id:vod._id, pagination:{page: requestedPage ?? 1, limit: SERIES_PAGE_SIZE}});
        if (res.ok && res.data) {
          const data = normalizeSeriesSeasons(res.data.data);
          setHasMore(data.length === SERIES_PAGE_SIZE);

          setSeasons(prev =>{
            const current = replace ? [] : prev;
            const existing = new Set(current.map(x => x._id));
            const merged = [
              ...current,
              ...data.filter(x => !existing.has(x._id)),
            ];
            return merged
          })
          if (requestedPage) setPage(requestedPage);
        } else {
          ToastNotification('error', `${res.data?.message}`);
          setHasMore(false);
        }
      } catch (error) {
        ToastNotification('error',`${error}`);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    }, [vod._id]);
  
    const loadMore = useCallback(() => {
      if (!hasMore || loading) return;
      handleGetSeasons(page + 1);
    }, [page, hasMore, loading, handleGetSeasons]);

    const sections = seasons.map(x => ({
      title: x.serial_number,
      data: Array.isArray(x.episodes) ? x.episodes : [],
    }));

    const toggleSection = (title:number) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  // Function to check if a section is collapsed
  const isSectionCollapsed = (title:number) => collapsedSections.has(title);

    useEffect(() =>{
      setPage(1);
      setHasMore(true);
      handleGetSeasons(1, true);
    }, [vod._id, accessStatus, handleGetSeasons]);
  return (
    <AppView className="mt-3 pt-[10px] border-t border-grey_200/10">
      <AppView className="w-[82px]">
        <AppText className="font-ROBOTO_700 text-white text-[13px]">
          EPISODES
        </AppText>
        <AppView className="w-[47px] mt-[3px] ml-1.5 h-[2px] bg-grey_100 rounded-[1px]" />
      </AppView>

      <AppView className="mt-5"> 
        <SectionList
        sections={sections}
        keyExtractor={(_,index) => index.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom:50}}
        onEndReachedThreshold={1}
        onEndReached={loadMore}
        renderSectionHeader={({section: {title}}) => {
          const isCollapsed = isSectionCollapsed(title);
          return (
             <TouchableOpacity 
             onPress={() => toggleSection(title)}
             className="ml-1 mb-2 flex-row items-center">
          <AppText className="mr-2 font-ROBOTO_400 text-white text-[13px]">
            Season {title}
          </AppText>
         <View style={{
          transform:[{rotateZ:isCollapsed?'-90deg':'0deg'}]
         }}>
          <OpenDropDwn />
         </View>
        </TouchableOpacity>
          );
        }}
        renderItem={({item:series, section}) => {
          if (isSectionCollapsed(section.title)) {
          return null;
        }
            return (
              <SeriesView
              item={series}
              vod={vod}
              accessStatus={accessStatus}
              makeFullscreen={makeFullscreen}
              setFullscreenContent={setFullscreenContent}
            />
          )
        }}
        ListFooterComponent={
          <>
            {loading && seasons.length > 2 && (
              <View className="h-20 items-center justify-center">
                <ActivityIndicator size={'large'} />
              </View>
            )}
          </>
        }
      />
      </AppView>
    </AppView>
  );
};

export default SeriesContent;

interface SeriesViewProps {
  item: IEpisode
  vod: IVODContent
  accessStatus: boolean
  makeFullscreen: () => void
  setFullscreenContent: React.Dispatch<React.SetStateAction<IDownloadData | null>>
}

const SeriesView = ({
 item,
 vod,
 accessStatus,
 makeFullscreen,
 setFullscreenContent
}: SeriesViewProps) => {
  const [downloadPercentage, setDownloadPercentage] = useState(0);
  const [size, setSize] = useState<string>('');
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const lastUpdateRef = useRef(Date.now());
  const {hasDownloadById,addDownload} = useAppPersistStore()
  const isDownloaded = hasDownloadById(item._id);
  const videoURL = getEpisodePlaybackUrl(item);
  const itemData:IDownloadData = {
    _id:item._id,
    desc:item.description,
    landscapePhoto:vod.landscapePhoto,
    portraitPhoto:vod.portraitPhoto,
    pg:vod.pg,
    size,
    title:item.title,
    type:vod.type,
    vidClass:vod.vidClass,
    video:videoURL,
    viewsCount:item.viewsCount,
    playbackRole: item.video ? 'main' : 'trailer',
  }
  
  async function handleDownload() {
          if (!item.videoUploadId) {
            ToastNotification('error', 'Download source is unavailable');
            return;
          }
          const sourceResponse = await fetchDownloadSource(item.videoUploadId);
          const downloadURL = sourceResponse.ok && sourceResponse.data
            ? sourceResponse.data.data.source
            : '';
          if (!downloadURL) {
            ToastNotification('error', sourceResponse.data?.message ?? 'Download source is unavailable');
            return;
          }
          const keys = await getAESKeys();
            if (!keys) {
              ToastNotification('error', 'This download isn’t available right now.');
              return;
            }
            const { key, iv } = keys;
  
            const fileSize = await getRemoteFileSize(downloadURL);
            const sizeInMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : null;
            if(sizeInMB) setSize(sizeInMB)
  
            setDownloadPercentage(0);
            setIsDownloading(true);
  
          const path = await downloadAndSave({
            url: downloadURL,
            filename: `${item._id}.mp4`,
             onProgress: (percent) => {
              const now = Date.now();
              const minUpdateInterval = 200;
              if (percent === 100 || now - lastUpdateRef.current > minUpdateInterval) {
                setDownloadPercentage(percent);
                lastUpdateRef.current = now;
              }
            },
          });
  
          if (!path) {
            ToastNotification('error','Download failed');
            return;
          }
            const encryptedPath = `${RNFS.DocumentDirectoryPath}/${item._id}.enc`;
            try {
              setIsDownloading(true)
              await encryptFile(path, encryptedPath, key, iv);
              console.log('Encryption successful:', encryptedPath);
  
          addDownload({
            _id:item._id,
            title:item.title,
            pg:vod.pg,
            portraitPhoto:vod.portraitPhoto,
            landscapePhoto:vod.landscapePhoto,
            video: encryptedPath,
            castVideo: downloadURL,
            size:sizeInMB,
            desc:item.description,
            type:'series',
            viewsCount:item.viewsCount,
            vidClass:vod.vidClass
          })
        } catch (error) {
          console.error('Encryption failed:', error);
          ToastNotification('error', 'Encryption failed');
        }finally{
          setIsDownloading(false)
        }
      }

  return (
    <AppView className="mb-6 flex-row w-full">
      {/* Player */}
      <AppView className="w-[153px] h-[95px] items-center justify-center overflow-hidden rounded-[8px] relative">
        <AppImage
          source={{uri: vod.landscapePhoto || vod.portraitPhoto}}
          style={{width: '100%', height: '100%'}}
          resizeMode="cover"
        />

        <TouchableOpacity
        disabled={!accessStatus || !videoURL}
          onPress={() =>
          [
            setFullscreenContent({...itemData}),
            makeFullscreen()
          ]
          } 
          className="absolute z-30 w-8 h-8 items-center justify-center rounded-full bg-black/60">
          {!accessStatus ? <LockWhite /> : <MiniPlayBtn />}
        </TouchableOpacity>
      </AppView>
      {/* details */}
      <AppView className="ml-3 flex-row flex-1 justify-between">
        <AppView className="mt-2 flex-1">
          <AppView className="flex-row items-center">
            <AppText className="mr-1 font-ROBOTO_400 text-[13px] text-white">
              {item.episodeNumber}.
            </AppText>
            <AppText className="font-ROBOTO_400 text-[13px] text-white">
              {item.title}
            </AppText>
          </AppView>

          <AppText className="max-w-[90%] mt-[7px] font-ROBOTO_400 text-[11px] text-white">
            {item.description}
          </AppText>
        </AppView>

        {/* Button */}
        <TouchableOpacity
          style={{alignContent: 'center', alignSelf: 'center'}}
          disabled={isDownloading || isDownloaded || !accessStatus}
          onPress={handleDownload}
          className="ml-1.5 w-9 justify-center items-center">
            {isDownloaded ? 
            <DownloadedCompleteIcon />
            :
          <PreviewDownloadIcon />
            }
          {isDownloading && <Text className='font-ROBOTO_400 text-white text-sm text-center my-[2px]'>{downloadPercentage}%</Text>}
          
        </TouchableOpacity>
      </AppView>
    </AppView>
  );
};
