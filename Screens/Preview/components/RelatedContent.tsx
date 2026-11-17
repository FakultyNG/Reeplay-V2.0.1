import {StyleSheet} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {AppImage, AppText, AppView, TouchableOpacity} from '@/components';
import Size from '@/Utils/useResponsiveSize';
import {previewContentType, RootNav} from '@/navigation/AppNavigator';
import routes from '@/navigation/routes';
import {useNavigation} from '@react-navigation/native';
import { IVODContent } from '@/types/api/content.types';
import ToastNotification from '@/components/ToastNotifications';
import {getRelatedVODs} from '@/api/content.api';
import Placeholder from '@/components/SkeletonLoader';
import FastImage from 'react-native-fast-image';
import { setPreviewContent } from '@/store/slices/previewContentSlice';
import { useAppDispatch } from '@/Hooks/reduxHook';

interface props {
  title: string;
  vodId:string
}

const RelatedContent = ({title, vodId}: props) => {
  const {replace} = useNavigation<RootNav>();
  const [loading, setLoading] = useState<boolean>(false)
  const [content, setContent] = useState<IVODContent[]>([]);
  const dispatch = useAppDispatch();

  const handleFetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRelatedVODs({vodId, pagination:{page:1, limit:6}})
      if(res.ok && res.data){
        setContent(res.data.data)
      } else {
        setContent([])
      }
    } catch (error) {
      ToastNotification('error', `${error}`);
    }finally{
      setLoading(false)
    }
  }, [vodId]);

  useEffect(() =>{
    handleFetchContent();
  }, [handleFetchContent])

  if (!loading && content.length === 0) return null;

  return (
    <AppView className="mt-5">
      <AppText className="mb-[10px] font-ROBOTO_700 text-white text-[21px]">
        {title}
      </AppText>
      <AppView style={styles.centerContent}>
        {(loading ? [...Array(6)] : content).map((item, index) => {
          const lib = item as IVODContent
          if(loading) return <Placeholder key={index} style={styles.image} />
          return (
            <TouchableOpacity
              activeOpacity={0.6}
              key={lib._id}
              onPress={() =>
                 [dispatch(setPreviewContent(item)), replace(routes.PREVIEW_SCREEN, {
                          content: item.type.includes('series') ? previewContentType['tv series'] : item.type.includes('video') ? previewContentType['music video'] : previewContentType.film,
                          videoURL: item.trailer,
                        })]
              }>
              <AppImage source={{
                uri: lib.portraitPhoto,
                priority:FastImage.priority.high
                }} 
                style={styles.image} 
              />
            </TouchableOpacity>
          );
        })}
      </AppView>
    </AppView>
  );
};

export default RelatedContent;

const styles = StyleSheet.create({
  image: {
    width: Size.getWidth() / 3 - 20,
    height: 133,
    borderRadius: 15,
  },
  centerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    // justifyContent: 'space-evenly',
    flexWrap: 'wrap',
    columnGap: Size.calcHeight(10),
    rowGap: Size.calcHeight(15),
    paddingBottom: 20,
  },
});
