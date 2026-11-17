import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, {Path, Rect} from 'react-native-svg';
import AppText from './AppText';
import fonts from '@/configs/fonts';

type BadgeSize = 'compact' | 'regular';

type Props = {
  contentType?: string | null;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

const BADGE_CONFIG = {
  premium: {label: 'Premium', color: '#06D097', icon: 'verified'},
  exclusive: {label: 'Exclusive', color: '#FF1313', icon: 'verified'},
  free: {label: 'Free', color: '#FFCC00', icon: 'unlocked'},
} as const;

const VerifiedIcon = ({color, size}: {color: string; size: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fill={color}
      d="M12 1.7l2.18 1.65 2.7-.34 1.05 2.51 2.5 1.06-.34 2.69L21.75 12l-1.66 2.18.34 2.7-2.5 1.05-1.06 2.5-2.69-.34L12 21.75l-2.18-1.66-2.7.34-1.05-2.5-2.5-1.06.34-2.69L2.25 12l1.66-2.18-.34-2.7 2.5-1.05 1.06-2.5 2.69.34L12 1.7z"
    />
    <Path
      d="M8.25 12.2l2.35 2.3 5.15-5.1"
      stroke="#FFFFFF"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UnlockedIcon = ({color, size}: {color: string; size: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7.5 10V7.6A4.6 4.6 0 0116 5.15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Rect x={5} y={10} width={14} height={10} rx={3} fill={color} />
    <Path
      d="M12 13.2v3.6"
      stroke="#17130A"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const ContentAccessBadge = ({
  contentType,
  size = 'compact',
  style,
  labelStyle,
}: Props) => {
  const normalizedType = contentType?.trim().toLowerCase();
  const config = BADGE_CONFIG[normalizedType as keyof typeof BADGE_CONFIG];

  if (!config) return null;

  const regular = size === 'regular';
  const iconSize = regular ? 18 : 15;

  return (
    <View
      accessible
      accessibilityLabel={`${config.label} content`}
      style={[styles.container, regular && styles.regularContainer, style]}>
      {config.icon === 'verified' ? (
        <VerifiedIcon color={config.color} size={iconSize} />
      ) : (
        <UnlockedIcon color={config.color} size={iconSize} />
      )}
      <AppText
        style={[
          styles.label,
          regular && styles.regularLabel,
          {color: config.color},
          labelStyle,
        ]}>
        {config.label}
      </AppText>
    </View>
  );
};

export default ContentAccessBadge;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  regularContainer: {
    gap: 7,
  },
  label: {
    fontFamily: fonts.ROBOTO_500,
    fontSize: 11,
    lineHeight: 15,
  },
  regularLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
});
