import React, {useCallback, useEffect} from 'react';
import {Linking, Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
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
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!ad || !isFocused) return;
    trackHouseAd('house_ad_impression', ad._id, sourceScreen);
  }, [ad, isFocused, sourceScreen]);

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
      <View style={styles.header}>
        <View style={styles.copy}>
          <AppText numberOfLines={1} style={styles.brand}>{ad.brand || 'REEPLAY'}</AppText>
          <AppText numberOfLines={1} style={styles.sponsored}>SPONSORED · {ad.title}</AppText>
        </View>
        <View style={styles.cta}>
          <AppText numberOfLines={1} style={styles.ctaText}>{ad.cta || 'Learn more'}</AppText>
        </View>
      </View>
      <View style={styles.mediaFrame}>
        <FastImage
          source={{
            uri: ad.photoUrl,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.web,
          }}
          resizeMode={FastImage.resizeMode.cover}
          style={styles.image}
        />
      </View>
    </Pressable>
  );
};

export default SurfaceAdCard;

const styles = StyleSheet.create({
  card: {overflow: 'hidden', padding: 4, borderRadius: 18, backgroundColor: '#17191E', borderWidth: 1, borderColor: '#343740'},
  pressed: {opacity: 0.84},
  header: {minHeight: 64, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12},
  copy: {flex: 1},
  brand: {color: '#FFFFFF', fontFamily: 'LEXEND_600', fontSize: 13},
  sponsored: {color: '#777C87', fontFamily: 'MANROPE_600', fontSize: 9, letterSpacing: 0.65, marginTop: 4},
  cta: {maxWidth: 112, minHeight: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E63B40'},
  ctaText: {color: '#FFFFFF', fontFamily: 'MANROPE_700', fontSize: 10},
  mediaFrame: {overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: '#08090B', backgroundColor: '#202228'},
  image: {width: '100%', aspectRatio: 16 / 9, backgroundColor: '#202228'},
});
