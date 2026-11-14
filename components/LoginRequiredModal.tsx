import React from 'react';
import {Modal, Pressable, StyleSheet, Text} from 'react-native';
import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import {useGuestAccessStore} from '@/store/guestAccess.store';

type Props = {onLogin: () => void};

export default function LoginRequiredModal({onLogin}: Props) {
  const {loginRequiredVisible, hideLoginRequired} = useGuestAccessStore();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={loginRequiredVisible}
      onRequestClose={hideLoginRequired}>
      <Pressable style={styles.overlay} onPress={hideLoginRequired}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.title}>Login required</Text>
          <Text style={styles.body}>
            Only free content is available without registration. Log in to use this feature.
          </Text>
          <Pressable style={styles.loginButton} onPress={onLogin}>
            <Text style={styles.loginText}>Login</Text>
          </Pressable>
          <Pressable onPress={hideLoginRequired}>
            <Text style={styles.cancelText}>Continue browsing</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: colors.DEEP_BLACK,
    padding: 24,
    alignItems: 'center',
  },
  title: {color: '#fff', fontFamily: fonts.MANROPE_700, fontSize: 22},
  body: {
    color: '#BCC1CA',
    fontFamily: fonts.MANROPE_400,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
  loginButton: {
    width: '100%',
    backgroundColor: colors.RED,
    borderRadius: 4,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 24,
  },
  loginText: {color: '#fff', fontFamily: fonts.MANROPE_700, fontSize: 16},
  cancelText: {
    color: '#BCC1CA',
    fontFamily: fonts.MANROPE_400,
    fontSize: 14,
    marginTop: 18,
  },
});
