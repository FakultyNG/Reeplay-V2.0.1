import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {CastButton} from 'react-native-google-cast';
import {VideoCastingIcon} from '@/assets/icons';

interface VideoCastingProps {
  handleCastingFunc?: () => void;
}

const Casting = memo(({}: VideoCastingProps) => {
  return (
    <View
      accessibilityLabel="Cast video"
      accessibilityRole="button"
      style={styles.container}>
      <View pointerEvents="none" style={styles.icon}>
        <VideoCastingIcon />
      </View>
      <CastButton
        accessibilityLabel="Cast video"
        style={styles.nativeButton}
      />
    </View>
  );
});

export default Casting;

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeButton: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
  },
});
