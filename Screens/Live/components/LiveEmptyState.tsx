import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {AppText} from '@/components';
import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import {FLiveIcon} from '@/assets/icons';
import Size from '@/Utils/useResponsiveSize';
import LinearGradient from 'react-native-linear-gradient';

interface Props {
  title?: string;
  message?: string;
  loading?: boolean;
  /** Optional icon override (defaults to live icon). Ignored when compact. */
  icon?: React.ReactNode;
  /** Taller featured/hero placeholder for the Live banner carousel. */
  variant?: 'section' | 'hero';
  /** Smaller centered copy, no icon — used when live content is missing. */
  compact?: boolean;
}

const LiveEmptyState = ({
  title = 'Nothing live right now',
  message = 'Check back soon — new channels and events will show up here.',
  loading = false,
  icon,
  variant = 'section',
  compact = false,
}: Props) => {
  const isHero = variant === 'hero';

  if (loading) {
    return (
      <View style={[styles.wrap, isHero && styles.heroWrap]}>
        <ActivityIndicator size="large" color={colors.RED} />
      </View>
    );
  }

  const resolvedIcon =
    icon ?? <FLiveIcon width={isHero ? 42 : 36} height={isHero ? 30 : 26} />;

  const content = (
    <>
      {!compact && (
        <View style={[styles.iconRing, isHero && styles.heroIconRing]}>
          {resolvedIcon}
        </View>
      )}
      <AppText
        style={[
          styles.title,
          isHero && styles.heroTitle,
          compact && styles.compactTitle,
        ]}>
        {title}
      </AppText>
      {!compact && (
        <AppText style={[styles.message, isHero && styles.heroMessage]}>
          {message}
        </AppText>
      )}
    </>
  );

  if (!isHero) {
    return (
      <View style={[styles.wrap, compact && styles.compactWrap]}>{content}</View>
    );
  }

  return (
    <View style={styles.heroShell}>
      <LinearGradient
        colors={['rgba(255,19,19,0.18)', 'rgba(0,0,0,0.35)', '#000']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroPoster}>
        <View style={styles.heroPosterInner}>{content}</View>
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.55)', colors.DEEP_BLACK]}
        locations={[0, 0.45, 1]}
        style={styles.heroBottomFade}
      />
    </View>
  );
};

export default LiveEmptyState;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: Size.calcHeight(48),
    paddingBottom: Size.calcHeight(64),
    minHeight: Size.calcHeight(220),
  },
  compactWrap: {
    paddingTop: Size.calcHeight(28),
    paddingBottom: Size.calcHeight(28),
    minHeight: Size.calcHeight(140),
  },
  heroWrap: {
    minHeight: Size.calcHeight(320),
    paddingTop: 0,
    paddingBottom: 0,
  },
  heroShell: {
    width: '100%',
    height: 510,
    paddingTop: 102,
    paddingHorizontal: Size.getWidth() * 0.06,
    paddingBottom: 24,
    justifyContent: 'flex-start',
  },
  heroPoster: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: colors.BLACKER,
  },
  heroPosterInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  heroBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    zIndex: 2,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,19,19,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,19,19,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroIconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 20,
  },
  title: {
    color: colors.WHITE,
    fontFamily: fonts.ROBOTO_700,
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 8,
  },
  compactTitle: {
    fontFamily: fonts.MANROPE_400,
    fontSize: 14,
    marginBottom: 0,
    color: colors.WHITE,
    textAlign: 'center',
    width: '100%',
  },
  heroTitle: {
    fontSize: 19,
  },
  message: {
    color: colors.DARK_GREY,
    fontFamily: fonts.ROBOTO_400,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 260,
  },
  heroMessage: {
    color: colors.GREY_WHITE,
    maxWidth: 280,
  },
});
