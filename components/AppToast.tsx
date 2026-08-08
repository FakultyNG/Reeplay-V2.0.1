import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  AppToastPayload,
  hideAppToast,
  subscribeAppToast,
  ToastType,
} from './ToastNotifications';

const BORDER: Record<ToastType, string> = {
  success: '#3CB371',
  error: '#FF4D4F',
  info: '#F3C63F',
};

export default function AppToast() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<AppToastPayload | null>(null);
  const toastRef = useRef<AppToastPayload | null>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    return subscribeAppToast(next => {
      toastRef.current = next;
      if (next) {
        setToast(next);
        progress.value = withTiming(1, {duration: 220});
        return;
      }

      progress.value = withTiming(0, {duration: 180}, finished => {
        if (finished && toastRef.current === null) {
          runOnJS(setToast)(null);
        }
      });
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{translateY: (1 - progress.value) * -24}],
  }));

  if (!toast) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, {paddingTop: Math.max(insets.top, 12) + 8}]}>
      <Animated.View style={[styles.cardWrap, animatedStyle]}>
        <Pressable
          onPress={hideAppToast}
          style={[styles.card, {borderLeftColor: BORDER[toast.type]}]}>
          <Text style={styles.text} numberOfLines={3}>
            {toast.text}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    minHeight: 54,
    borderRadius: 6,
    borderLeftWidth: 5,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
});
