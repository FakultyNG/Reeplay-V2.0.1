import {FlatList, StyleSheet} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {
  AppHeader,
  AppImage,
  AppScreen,
  AppText,
  AppView,
  TouchableOpacity,
} from '@/components';
import {DeleteIcon} from '@/assets/icons';
import {useNavigation} from '@react-navigation/native';
import AppModal from '@/components/AppModal';
import DownloadModal from '../Preview/components/DownloadModal';
import useToggle from '@/Hooks/useToggle';
import { useAppPersistStore } from '@/store/zustand.store';
import { IDownloadData } from '@/types/api/content.types';
import {decryptFile, getAESKeys} from '../Preview/utils/downloadUtils';
import ToastNotification from '@/components/ToastNotifications';
import DownloadFullscreenModalPlayer from './FullscreenModalPlayer';
import { OrientationInjectedProps } from '@/components/OrientationWrapper';
import SurfaceAdCard from '@/components/SurfaceAdCard';

const DownoadScreen = ({isFullscreen,makeFullscreen,makePortrait}:OrientationInjectedProps) => {
  const {canGoBack} = useNavigation()
  const [data, setData] = useState<IDownloadData[]>([]);
  const [isDownload, setIsDownload] = useToggle(false);
  const [isDeleteIndex, setIsDeleteIndex] = useState<IDownloadData|null>(null);
  const {downloadedList, removeDownloadById} = useAppPersistStore();
  const [isFullscreenContent, setFullscreenContent] = useState<IDownloadData|null>(null)

  function handleDelete(id: string) {
    removeDownloadById(id)
    const newData = data.filter(item => item._id !== id);
    setData(newData);
  }

  useEffect(() => {
  if (downloadedList) {
    const seenIds = new Set();
    const uniqueDownloads = downloadedList.filter(item => {
      const isUnique = !seenIds.has(item._id);
      seenIds.add(item._id);
      return isUnique;
    });

    setData(uniqueDownloads);
  }
}, [downloadedList]);

  return (
    <>
      {!isFullscreen && <AppScreen containerStyle={{paddingTop: 15}}>
        {canGoBack() && <AppHeader />}

        <SurfaceAdCard sourceScreen="Downloads" style={styles.adCard} />

        <AppView className="mt-6 mb-6 flex-row items-center justify-between">
          <AppView className="w-fit ml-4">
            <AppText className="font-ROBOTO_700 text-white text-[17px]">
              DOWNLOADS
            </AppText>
            <AppView className="w-[82px] mt-[3px] ml-[10px] h-[2px] bg-grey_100 rounded-[1px]" />
          </AppView>

          <AppText className="font-MANROPE_400 text-[13px] text-yellow">
            {data.length} downloads
          </AppText>
        </AppView>

        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          // bounces={false}
          renderItem={({item}) => {
            return (
              <DownloadItem 
                item={item} 
                handleDelete={() => [setIsDeleteIndex(item), setIsDownload(true)]} 
                handleFullscreenContent={(url) => [setFullscreenContent({...item, video:url}), makeFullscreen()]}
              />
            );
          }}
        />

        <AppModal
          isModalVisible={isDownload}
          hideCloseBtn
          hideLoge
          replaceDefaultContent={
            <DownloadModal
              img={isDeleteIndex?.portraitPhoto??''}
              handleDelete={() => handleDelete(isDeleteIndex?._id??'')}
              setIsDownload={() => setIsDownload(false)}
            />
          }
          handleClose={() => setIsDownload(false)}
        />
      </AppScreen>}

       {(isFullscreenContent && isFullscreen) && <DownloadFullscreenModalPlayer 
          minimalUi
          isFullscreen={isFullscreen}
          content={isFullscreenContent}
          setFullscreen={() => isFullscreen ? [makePortrait(), setFullscreenContent(null)] : makeFullscreen()} 
          isDownloadScreen
        />}
    </>
  );
};

export default DownoadScreen;


interface Props{
  item:IDownloadData
  handleDelete:() => void
  handleFullscreenContent:(url:string) => void
}
export const DownloadItem = ({item, handleFullscreenContent, handleDelete}:Props) =>{
  const [url, setUrl] = useState<string>('')
  const handleDecyptionURL = useCallback(async () => {
    const keys = await getAESKeys();
    if (!keys) {
      ToastNotification('error', 'This download can’t be opened right now.');
        return;
      }
    const { key, iv } = keys;

    const path = await decryptFile(item.video, key, iv);
      setUrl(path);
  }, [item.video]);

  useEffect(() =>{
    handleDecyptionURL();
  }, [handleDecyptionURL])

  return(
    <AppView className="pb-2 flex-row items-center mb-2 border-b border-grey_200/10">
              <TouchableOpacity
                onPress={() => handleFullscreenContent(url)}
                >
                <AppImage
                  source={{uri:item.portraitPhoto}}
                  style={{width:203, height:106, borderRadius:4}}
                />
              </TouchableOpacity>

              <AppView className="justify-center items-center flex-1">
                <AppText className="font-LEXEND_700 text-base text-white text-center leading-[17px]">
                  {item.title}
                </AppText>

                <AppView className="flex-row items-center gap-x-2 mt-2">
                  <AppText className="font-MANROPE_400 text-xs text-yellow">
                    {item.pg}+
                  </AppText>
                  <AppView className="w-[1px] h-[68%] bg-white" />
                  <AppText className="font-MANROPE_400 text-xs text-white">
                    {item.size && `${item.size}MB`}
                  </AppText>
                  <AppView className="w-[1px] h-[68%] mr-[2px] bg-white" />
                  <TouchableOpacity
                    onPress={handleDelete}>
                    <DeleteIcon />
                  </TouchableOpacity>
                </AppView>
              </AppView>
            </AppView>
  )
}

const styles = StyleSheet.create({
  adCard: {marginTop: 22},
});
