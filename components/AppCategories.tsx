import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import React, {useState} from 'react';
import SectionHeader, {
  headerProps,
} from '@/Screens/Home/components/SectionHeader';
import {AppImage, AppText, AppView} from '@/components';
import Size from '@/Utils/useResponsiveSize';
import {PlayVideoIcon} from '@/assets/icons';
import LinearGradient from 'react-native-linear-gradient';
import FastImage, {ImageStyle} from 'react-native-fast-image';
import {IVODContent} from '@/types/api/content.types';
import Placeholder from './SkeletonLoader';
import {useAppDispatch} from '@/Hooks/reduxHook';
import {setPreviewContent} from '@/store/slices/previewContentSlice';
import {previewContentType, RootNav} from '@/navigation/AppNavigator';
import routes from '@/navigation/routes';
import {useNavigation} from '@react-navigation/native';

interface CategoriesProsp extends headerProps {
  movieCategories: IVODContent[];
  imageStyle?: ImageStyle;
  style?: ViewStyle;
  tag?: boolean;
  video?: boolean;
  space?: number;
  onPressMovie?: (item: any) => void;
  linearGradient?: boolean;
  isLoading?: boolean;
  onIndexChange?: (index: number) => void;
}

const AppCategories = ({
  title,
  btnText,
  onPress,
  movieCategories,
  imageStyle,
  style,
  tag,
  video,
  space,
  headerStyle,
  linearGradient,
  isLoading,
  onIndexChange,
}: CategoriesProsp) => {
  const itemWidth =
    typeof imageStyle?.width === 'number'
      ? imageStyle.width
      : Size.calcWidth(117);
  const itemGap =
    typeof style?.marginRight === 'number'
      ? style.marginRight
      : Size.calcHeight(12);
  const itemStride = itemWidth + itemGap;

  return (
    <View>
      <SectionHeader
        headerStyle={headerStyle}
        title={title}
        btnText={btnText}
        onPress={onPress}
      />

      <FlatList
        data={isLoading ? [...Array(10)] : movieCategories}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{marginTop: space ? space : 15, marginRight: 10}}
        onScroll={event => {
          if (!onIndexChange) {
            return;
          }
          const offsetX = event.nativeEvent.contentOffset.x;
          // First fully/mostly visible item — matches the 3-item viewport.
          const index = Math.max(
            0,
            Math.floor((offsetX + itemStride * 0.25) / Math.max(itemStride, 1)),
          );
          onIndexChange(index);
        }}
        scrollEventThrottle={16}
        renderItem={({item, index}) => {
          if (isLoading) {
            return (
              <Placeholder
                style={{...styles.images, borderRadius: 5, marginRight: 10}}
              />
            );
          }
          return (
            <ContentItem
              index={index}
              item={item}
              imageStyle={imageStyle}
              linearGradient={linearGradient}
              tag={tag}
              style={style}
              video={video}
            />
          );
        }}
      />
    </View>
  );
};

export default AppCategories;

interface ContentItemProps {
  item: IVODContent;
  imageStyle?: ImageStyle;
  style?: ViewStyle;
  index: number;
  tag?: boolean;
  video?: boolean;
  linearGradient?: boolean;
}

export const ContentItem = ({
  item,
  imageStyle,
  index,
  style,
  tag,
  video,
  linearGradient,
}: ContentItemProps) => {
  const [loading, setLoading] = useState<boolean>(true);
  const dispatch = useAppDispatch();
  const {navigate} = useNavigation<RootNav>();

  if (!item) {
    return null;
  }

  return (
    <View className="relative">
      {loading && (
        <View className="absolute z-10 rounded-[5px] overflow-hidden">
          <Placeholder style={styles.images} />
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        style={[style, styles.container]}
        onPress={() => {
          if (!item?._id) {
            return;
          }
          const type = (item.type ?? '').toLowerCase();
          dispatch(setPreviewContent(item));
          navigate(routes.PREVIEW_SCREEN, {
            content: type.includes('series')
              ? previewContentType['tv series']
              : type.includes('video')
                ? previewContentType['music video']
                : previewContentType.film,
            videoURL: item.trailer ?? '',
          });
        }}>
        <AppView
          style={imageStyle}
          className="w-full rounded-[5px] overflow-hidden">
          <AppImage
            source={{
              uri: item.portraitPhoto,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            }}
            style={[styles.images, imageStyle]}
            onLoadEnd={() => setLoading(false)}
          />
        </AppView>
        {tag && (
          <AppView className="absolute top-0 left-0 items-center justify-center w-[18px] h-[20px] bg-red rounded-tl-[5px] rounded-br-[8px]">
            <AppText className="font-ROBOTO_700 text-[9px] text-white -mt-[2px]">{`${
              index + 1 < 10 ? 0 : ''
            }${index + 1}`}</AppText>
          </AppView>
        )}
        {video && (
          <View style={styles.playBtn}>
            <PlayVideoIcon />
          </View>
        )}
        {video && (
          <AppView
            style={{alignSelf: 'center'}}
            className="absolute z-30 bottom-1.5">
            <AppText className="font-MANROPE_400 text-[10px] text-white uppercase ml-1">
              {item.title}
            </AppText>
            <AppText className="font-MANROPE_700 text-xs text-white">
              {item.subtitle}
            </AppText>
          </AppView>
        )}
        {linearGradient && (
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.9)']}
            style={{
              position: 'absolute',
              bottom: -5,
              width: '100%',
              height: '60%',
            }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  images: {
    width: Size.calcWidth(117),
    height: Size.calcHeight(161),
  },
  container: {
    borderRadius: 5,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    position: 'absolute',
  },
});
