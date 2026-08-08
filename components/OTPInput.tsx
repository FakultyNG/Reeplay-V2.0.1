import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import React, {useEffect, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

interface OTPInputProps {
  pinCount: number;
  handleCode: (code: string) => void;
  style?: StyleProp<TextStyle>;
  space?: boolean;
}

/**
 * One real TextInput (invisible) + visual digit cells.
 * Avoids multi-input focus hopping, which breaks often on Android.
 */
const OTPInput = ({pinCount, handleCode, style, space}: OTPInputProps) => {
  const [code, setCode] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const handleCodeRef = useRef(handleCode);
  handleCodeRef.current = handleCode;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    handleCodeRef.current(code);
    if (code.length >= pinCount) {
      Keyboard.dismiss();
      inputRef.current?.blur();
    }
  }, [code, pinCount]);

  const activeIndex = Math.min(code.length, pinCount - 1);

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={text => {
          setCode(text.replace(/\D/g, '').slice(0, pinCount));
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        importantForAutofill="yes"
        caretHidden
        contextMenuHidden
        maxLength={pinCount}
        autoFocus
        style={styles.hiddenInput}
        accessibilityLabel="One-time passcode"
      />

      {/* Visual only — touches hit the TextInput above */}
      <View style={styles.cellsRow} pointerEvents="none">
        {Array.from({length: pinCount}, (_, index) => {
          const char = code[index] ?? '';
          const isActive = isFocused && index === activeIndex;
          const cellStyle: StyleProp<ViewStyle> = [
            styles.cell,
            char ? styles.cellFilled : styles.cellEmpty,
            isActive && styles.cellActive,
            space && index === 3 ? styles.spaceGap : null,
          ];

          return (
            <View key={index} style={cellStyle}>
              <Text style={[styles.cellText, style]}>{char}</Text>
              {isActive && !char ? <View style={styles.caret} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const CELL_H = 43;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CELL_H,
    // Android ignores fully transparent focused inputs; keep a tiny opacity.
    opacity: 0.05,
    color: 'transparent',
    backgroundColor: 'transparent',
    zIndex: 2,
    fontSize: 1,
  },
  cellsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  cell: {
    borderWidth: 1,
    width: 39,
    height: CELL_H,
    margin: 5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellEmpty: {
    borderColor: colors.WHITE,
  },
  cellFilled: {
    borderColor: colors.RED,
  },
  cellActive: {
    borderColor: colors.RED,
  },
  cellText: {
    fontSize: 16,
    fontFamily: fonts.MANROPE_400,
    color: colors.WHITE,
    textAlign: 'center',
  },
  caret: {
    position: 'absolute',
    width: 1.5,
    height: 18,
    backgroundColor: colors.WHITE,
    borderRadius: 1,
  },
  spaceGap: {
    marginLeft: 20,
  },
});

export default OTPInput;
