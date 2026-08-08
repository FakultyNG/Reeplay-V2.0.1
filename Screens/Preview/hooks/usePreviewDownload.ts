import {useCallback, useRef, useState} from 'react';
import RNFS from 'react-native-fs';
import ToastNotification from '@/components/ToastNotifications';
import {getRemoteFileSize} from '@/api/external.api';
import {useAppPersistStore} from '@/store/zustand.store';
import {IVODContent} from '@/types/api/content.types';
import {downloadAndSave, encryptFile, getAESKeys} from '../utils/downloadUtils';

export function usePreviewDownload(previewContent: IVODContent) {
  const {hasDownloadById, addDownload} = useAppPersistStore();
  const isDownloaded = hasDownloadById(previewContent._id);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercentage, setDownloadPercentage] = useState(0);
  const lastUpdateRef = useRef(Date.now());

  const handleDownload = useCallback(async () => {
    const keys = await getAESKeys();
    if (!keys) {
      ToastNotification('error', 'Encryption keys missing');
      return;
    }
    const {key, iv} = keys;

    const fileSize = await getRemoteFileSize(previewContent.video);
    const sizeInMB = fileSize
      ? (fileSize / (1024 * 1024)).toFixed(2)
      : null;

    setDownloadPercentage(0);
    setIsDownloading(true);

    const path = await downloadAndSave({
      url: previewContent.video,
      filename: `${previewContent._id}.mp4`,
      onProgress: percent => {
        const now = Date.now();
        if (percent === 100 || now - lastUpdateRef.current > 200) {
          setDownloadPercentage(percent);
          lastUpdateRef.current = now;
        }
      },
    });

    if (!path) {
      ToastNotification('error', 'Download failed');
      setIsDownloading(false);
      return;
    }

    const encryptedPath = `${RNFS.DocumentDirectoryPath}/${previewContent._id}.enc`;
    try {
      setIsDownloading(true);
      await encryptFile(path, encryptedPath, key, iv);
      addDownload({
        _id: previewContent._id,
        title: previewContent.title,
        pg: previewContent.pg,
        portraitPhoto: previewContent.portraitPhoto,
        landscapePhoto: previewContent.landscapePhoto,
        video: encryptedPath,
        size: sizeInMB,
        desc: previewContent.description,
        type: previewContent.type,
        viewsCount: previewContent.viewsCount,
        vidClass: previewContent.vidClass,
      });
    } catch (error) {
      console.error('Encryption failed:', error);
      ToastNotification('error', 'Encryption failed');
    } finally {
      setIsDownloading(false);
    }
  }, [addDownload, previewContent]);

  return {
    isDownloaded,
    isDownloading,
    downloadPercentage,
    handleDownload,
  };
}
