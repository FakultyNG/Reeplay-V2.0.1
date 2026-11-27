import React, {useCallback, useEffect, useRef} from 'react';
import {Linking, Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';
import InAppBrowser from 'react-native-inappbrowser-reborn';

import {useAppSelector} from '@/Hooks/reduxHook';
import {selectAdsContent} from '@/store/slices/adsSlice.slice';
import {trackHouseAd} from '@/api/analytics.api';
import AppText from './AppText';

type Props = {
  sourceScreen: string;
  style?: StyleProp<ViewStyle>;
};

const SurfaceAdCard = ({sourceScreen, style}: Props) => {
  const ad = useAppSelector(selectAdsContent).ads[0];
  const impressionTracked = useRef('');

  useEffect(() => {
    if (!ad || impressionTracked.current === ad._id) return;
    impressionTracked.current = ad._id;
    trackHouseAd('house_ad_impression', ad._id, sourceScreen);
  }, [ad, sourceScreen]);

  const openAd = useCallback(async () => {
    if (!ad || !/^https?:\/\//i.test(ad.link)) return;
    trackHouseAd('house_ad_click', ad._id, sourceScreen);
    try {
      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.open(ad.link, {
          dismissButtonStyle: 'close',
          preferredBarTintColor: '#111111',
          preferredControlTintColor: '#FFFFFF',
          toolbarColor: '#111111',
          secondaryToolbarColor: '#111111',
          navigationBarColor: '#111111',
          showTitle: true,
          enableUrlBarHiding: true,
          enableDefaultShare: true,
        });
      } else {
        await Linking.openURL(ad.link);
      }
    } catch (error) {
      console.warn(`Unable to open ${sourceScreen} ad`, error);
    }
  }, [ad, sourceScreen]);

  if (!ad) return null;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open advertisement from ${ad.brand || ad.title}`}
      onPress={openAd}
      style={({pressed}) => [styles.card, style, pressed && styles.pressed]}>
      <FastImage
        source={{
          uri: ad.photoUrl,
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.web,
        }}
        resizeMode={FastImage.resizeMode.cover}
        style={styles.image}
      />
      <View style={styles.footer}>
        <View style={styles.copy}>
          <AppText numberOfLines={1} style={styles.sponsored}>SPONSORED · {ad.brand || 'REEPLAY'}</AppText>
          <AppText numberOfLines={1} style={styles.title}>{ad.title}</AppText>
        </View>
        <View style={styles.cta}>
          <AppText numberOfLines={1} style={styles.ctaText}>{ad.cta || 'Learn more'}</AppText>
        </View>
      </View>
    </Pressable>
  );
};

export default SurfaceAdCard;

const styles = StyleSheet.create({
  card: {overflow: 'hidden', borderRadius: 16, backgroundColor: '#17191E', borderWidth: 1, borderColor: '#292C33'},
  pressed: {opacity: 0.84},
  image: {width: '100%', aspectRatio: 16 / 9, backgroundColor: '#202228'},
  footer: {minHeight: 64, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12},
  copy: {flex: 1},
  sponsored: {color: '#777C87', fontFamily: 'MANROPE_600', fontSize: 9, letterSpacing: 0.65},
  title: {color: '#FFFFFF', fontFamily: 'MANROPE_600', fontSize: 13, marginTop: 3},
  cta: {maxWidth: 110, minHeight: 34, paddingHorizontal: 13, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  ctaText: {color: '#D7282F', fontFamily: 'MANROPE_700', fontSize: 11},
});
