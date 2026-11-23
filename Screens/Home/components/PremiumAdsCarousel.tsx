import React, {useCallback, useRef} from 'react';
import {
  FlatList,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {useAppSelector} from '@/Hooks/reduxHook';
import {selectHomeAds} from '@/store/slices/adsSlice.slice';
import SectionHeader from './SectionHeader';
import Size from '@/Utils/useResponsiveSize';
import {IHomeAdData} from '@/types/api/content.types';
import {trackHouseAd} from '@/api/analytics.api';

const CARD_WIDTH = Size.getWidth() - 54;
const CARD_GAP = 12;

interface Props {
  title?: string;
}

const PremiumAdsCarousel = ({title = 'Premium Ads'}: Props) => {
  const ads = useAppSelector(selectHomeAds);
  const seenAds = useRef(new Set<string>());

  const openAd = useCallback(async (ad: IHomeAdData) => {
    trackHouseAd('house_ad_click', ad._id, 'Home');
    if (!/^https?:\/\//i.test(ad.link)) {
      return;
    }
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
      console.warn('Unable to open Home-Ad CTA', error);
    }
  }, []);

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken<IHomeAdData>[]}) => {
      viewableItems.forEach(({item, isViewable}) => {
        if (isViewable && !seenAds.current.has(item._id)) {
          seenAds.current.add(item._id);
          trackHouseAd('house_ad_impression', item._id, 'Home');
        }
      });
    },
  ).current;

  if (ads.length === 0) {
    return null;
  }

  return (
    <View>
      <SectionHeader title={title} btnText="" />
      <FlatList
        horizontal
        data={ads}
        keyExtractor={item => item._id}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        disableIntervalMomentum
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{itemVisiblePercentThreshold: 50, minimumViewTime: 500}}
        contentContainerStyle={styles.list}
        renderItem={({item, index}) => (
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel={`Open ${item.title}`}
            activeOpacity={0.82}
            onPress={() => void openAd(item)}
            style={[
              styles.card,
              {marginRight: index === ads.length - 1 ? 0 : CARD_GAP},
            ]}>
            <FastImage
              source={{
                uri: item.photoUrl,
                priority: index < 2 ? FastImage.priority.high : FastImage.priority.normal,
                cache: FastImage.cacheControl.web,
              }}
              resizeMode={FastImage.resizeMode.cover}
              style={styles.poster}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default PremiumAdsCarousel;

const styles = StyleSheet.create({
  list: {
    paddingTop: 15,
    paddingRight: 20,
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
});
