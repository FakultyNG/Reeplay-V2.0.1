import {
  View,
  Text,
  ImageSourcePropType,
  Animated,
  Platform,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import React, { Fragment, useEffect, useState } from 'react';
import FastImage from 'react-native-fast-image';
import { AppButton, AppImage, AppText, AppView } from '@/components';
import Size from '@/Utils/useResponsiveSize';
import colors from '@/configs/colors';
import {
  Exclusive_B,
  FreeIcon_B,
  InfoIcon,
  PremiumIcon_B,
  SmPlayIcon,
} from '@/assets/icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import routes from '@/navigation/routes';
import { previewContentType, RootNav } from '@/navigation/AppNavigator';
import LinearGradient from 'react-native-linear-gradient';
import { AnimatedLin } from '../homeShared';
import { checkTimeStatus } from '@/Utils/timeStatus';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { ILiveContent, IVODContent } from '@/types/api/content.types';
import getSymbolFromCurrency from 'currency-symbol-map';
import { formatAmount } from '@/Utils/formatAmount';
import AppModal from '@/components/AppModal';
import LiveInfoModal from '@/Screens/Live/components/LiveInfoModal';
import { useAppDispatch, useAppSelector } from '@/Hooks/reduxHook';
import { setPreviewContent } from '@/store/slices/previewContentSlice';
import { selectUserPremiumCost } from '@/store/slices/bannerSlice.slice';
import { hasPaidContentStatus } from '@/api/content.api';
import { getWatchTag } from '@/Utils/contentUtils';
import { setFullVideoProps } from '@/store/slices/fullScreenVideo.slice';
import {requireRegisteredUser} from '@/Utils/guestAccess';

const ITEM_WIDTH = Size.getWidth() * 0.88;
const WIDTH = Dimensions.get('window').width;


interface Props {
  item: IVODContent | ILiveContent;
  translate?: Animated.AnimatedInterpolation<string | number>;
  currentIndex: boolean;
  live?: boolean;
  colors: string[];
  watchLive?:() => void
   handleVODTrailer?: () => void
}

const Caurosel = ({
  item,
  colors: colorsArr,
  translate,
  currentIndex,
  live,
  watchLive,
handleVODTrailer
}: Props) => {
  const { navigate } = useNavigation<RootNav>();
  const [videoURL, setVideoURL] = useState<string>('');
  const [imgLoad, setImgLoad] = useState<boolean>(true);
  const [modal, setModal] = useState<string|null>(null);
  const isFocused = useIsFocused();
  const startTime = item && 'start' in item ? item.start : item?.releaseDate;
  const endTime = item && 'start' in item ? item.expiry : item?.expiryDate
  const isTime = checkTimeStatus(startTime ?? '', endTime ?? '');
  const dispatch = useAppDispatch()
  const [contentIsPaid, setContentIsPaid] = useState<boolean>(item && 'adminId' in item ? false : !!(item as ILiveContent)?.canView)
  const data = useAppSelector(selectUserPremiumCost)

  async function handleContentStatusUpdate(){
            if (!item?._id) {
              setContentIsPaid(false);
              return;
            }
            if(item.vidClass === 'free'){
              setContentIsPaid(true);
            }else{
              const res = await hasPaidContentStatus({contentType: live ?'live':'vod', _id:item._id})
              if(res.ok && res.data){
                setContentIsPaid(res.data.data.canView)
              } else {
                // Silent fail on home hero — toasting here spams FAILED for every carousel slide.
                setContentIsPaid(false);
              }
            }
          }

   useEffect(() => {
     if (!item) {
       setImgLoad(false);
       return;
     }
     function preloadMedia() {
      try {
        // Do not FastImage.preload trailers/preview videos — that saturates
        // the image pipeline with huge files on a cold cache.
        if (live && 'start' in item) setVideoURL(item.previewVideo ?? '');
        if ('adminId' in item) setVideoURL(item.trailer ?? '');
      } catch (err) {
        console.log('Error preloading media:', err);
        setImgLoad(false);
      }
    }

    if (isFocused) {
      preloadMedia();
      handleContentStatusUpdate();
    }
  }, [isFocused, item?._id]);

  if (!item) {
    return <View style={{width: WIDTH, height: 410}} />;
  }

  const title = item.title ?? '';
  const contentType = item.type ?? '';
  const isMusicVideo =
    !live &&
    contentType.toLowerCase().replace(/[\s_-]+/g, '-') === 'music-video';
  const artistName =
    'adminId' in item ? item.artistName?.trim() : undefined;
  const openPreview = () => {
    dispatch(setPreviewContent(item as IVODContent));
    navigate(routes.PREVIEW_SCREEN, {
      content: contentType.toLowerCase().includes('series')
        ? previewContentType['tv series']
        : contentType.toLowerCase().includes('video')
          ? previewContentType['music video']
          : previewContentType.film,
      videoURL: 'adminId' in item ? item.trailer ?? '' : '',
    });
  };

  const openPaywallOrPlay = () => {
    if (contentIsPaid) {
      watchLive?.();
      if (live) {
        dispatch(setFullVideoProps(item));
      }
      handleVODTrailer?.();
      return;
    }
    if (!requireRegisteredUser()) return;
    navigate(routes.MAIN, {
      screen: routes.SUBSCRIPTION_SCREEN,
      params: {
        tab: getWatchTag(item.vidClass, live ?? false),
        currency:
          item.vidClass === 'premium' && data
            ? data.currencyCode
            : item.currency,
        amount: `${
          item.vidClass === 'premium' && data ? data.amount : item.amount
        }`,
        stage: 'paymentSummary',
        metadata: live ? {liveId: item._id} : {videoId: item._id},
      },
    });
  };

  return (
    <Animated.View
      style={{
        width: WIDTH,
        position: 'relative',
        alignItems: 'center',
        overflow: 'hidden',
        flex: 1,
        flexGrow: 2,
      }}>
      {!live && colorsArr.length > 0 && (
        <AppView
          style={{width: ITEM_WIDTH, height: '55%', bottom: -1}}
          className="overflow-hidden absolute z-[1] rounded-b-[7px]"
          pointerEvents="none">
          <LinearGradient
            colors={colorsArr}
            locations={[0, 0.35, 0.75, 1]}
            style={{
              width: ITEM_WIDTH,
              height: '100%',
            }}
          />
        </AppView>
      )}

      {live && currentIndex && (
        <AnimatedLin
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(300)}
          colors={['transparent', 'rgba(0, 0, 0, 0.8)', 'rgb(0, 0, 0)']}
          style={[
            {
              bottom: -1,
              zIndex: 1,
              width: ITEM_WIDTH,
              position: 'absolute',
              height: '60%',
            },
          ]}
        />
      )}

      {imgLoad && (
        <AppView className="absolute w-full h-full items-center justify-center z-10">
          <ActivityIndicator size={'large'} color={colors.RED} />
        </AppView>
      )}

      {(live && 'start' in item && item.coverPhoto) && (
        <FastImage
          source={{
            uri: item.coverPhoto,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }}
          onLoadEnd={() => setImgLoad(false)}
          onError={() => setImgLoad(false)}
          style={{
            width: ITEM_WIDTH,
            position: 'absolute',
            height: '100%',
            borderRadius: 7,
          }}
        />
      )}

      {("adminId" in item && !live) && <FastImage
        source={{
          uri: item.portraitPhoto,
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable,
        }}
        onLoadEnd={() => setImgLoad(false)}
        onError={() => setImgLoad(false)}
        style={{
          width: ITEM_WIDTH,
          position: 'absolute',
          height: '100%',
          borderRadius: 7,
        }}
      />}

      <AppView className="absolute bottom-4 z-10 items-center">
        <View className='flex-row items-center gap-x-1.5 mb-1'>
        {live && <TouchableOpacity
        activeOpacity={.7}
        // onPress={() => } TODO: ADD DESCRIPTION MODAL
        >
        {item.vidClass === 'premium' ? (
                  <PremiumIcon_B />
                ) :
                  item.vidClass === 'exclusive' ? (
                    <Exclusive_B />
                  ) : (
                    <FreeIcon_B />
                  )}
        </TouchableOpacity>}
        <AppText className="text-white text-sm uppercase font-MANROPE_400 mt-[2px]">
          {contentType}
        </AppText>
        </View>
        <AppText
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          style={{
            maxWidth: ITEM_WIDTH - Size.calcWidth(24),
            fontSize: Math.min(40, Math.max(26, Size.calcWidth(40))),
            lineHeight: Math.min(49, Math.max(32, Size.calcWidth(49))),
          }}
          className="font-LEXEND_700 text-white mb-1 text-center">
          {title}
        </AppText>
        {!live && (
          <AppView className="flex-row items-center justify-center">
            {isMusicVideo ? (
              artistName ? (
                <AppText className="font-ROBOTO_400 text-sm text-grey_200">
                  {artistName}
                </AppText>
              ) : null
            ) : (
              'adminId' in item &&
              Array.isArray(item.genre) &&
              item.genre.map((tag, i) => {
                return (
                  <Fragment key={tag?._id ?? i}>
                    <AppText className="font-ROBOTO_400 text-sm text-grey_200">
                      {tag?.name}
                    </AppText>
                    {i !== item.genre.length - 1 && (
                      <AppView className="w-1.5 h-1.5 rounded-full bg-white mt-[2.5px] mx-1.5" />
                    )}
                  </Fragment>
                );
              })
            )}
          </AppView>
        )}

        <AppView className="flex-row items-center justify-center mt-1.5">
          <AppButton
            bgColor={live ? colors.GREY_600 : colors.RED}
            onPress={() => (!live ? openPreview() : setModal('live'))}
            replaceDefaultContent={
                <InfoIcon />
            }
            style={{
              width: Size.calcHeight(85),
              borderRadius: 4,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              marginRight: 2,
              paddingVertical: 17.5,
            }}
          />
          <AppButton
            bgColor={colors.RED}
            onPress={openPaywallOrPlay}
            style={{
              width: Size.calcHeight(152),
              borderRadius: 4,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              paddingVertical: 17,
            }}
            replaceDefaultContent={
              <AppView className="flex-row items-center justify-center">
                {!contentIsPaid ?
                (item.vidClass === 'premium'&& data && data.currencyCode && data.amount) ? <Text className="text-[15px] text-white font-ROBOTO_700 text-center -ml-1">
                  {getSymbolFromCurrency(data.currencyCode)}{formatAmount(data.amount, data.currencyCode)}
                  </Text>  : 
                (item.amount && item.currency) ? <Text className="text-[15px] text-white font-ROBOTO_700 text-center -ml-1">
                  {getSymbolFromCurrency(item.currency)}{formatAmount(item.amount, item.currency)}
                  </Text> : <>
                <SmPlayIcon />
                <AppText className="text-[15px] text-white font-ROBOTO_700 ml-[10px]">
                  {live ? 'Watch' : 'Play'}
                </AppText>
                </>: <>
                <SmPlayIcon />
                <AppText className="text-[15px] text-white font-ROBOTO_700 ml-[10px]">
                  {live ? 'Watch' : 'Play'}
                </AppText>
                </>}
              </AppView>
            }
          />
        </AppView>
      </AppView>

      <AppModal 
        isModalVisible={modal !== null}
        handleClose={() => setModal(null)}
        style={{padding:0, margin:0, marginLeft:0, height:Size.hp(50)}}
        hideCloseBtn
        hideLoge
        replaceDefaultContent={
          <>
          {modal === 'live' && <LiveInfoModal 
              item={item}
              handleClose={() => setModal(null)}
              isBanner
            />
          }
          </>
        }
      />
    </Animated.View>
  );
};

export default Caurosel;
