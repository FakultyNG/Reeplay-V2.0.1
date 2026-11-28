import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';

import {AppHeader, AppScreen, AppText} from '@/components';
import ToastNotification from '@/components/ToastNotifications';
import {useAppSelector} from '@/Hooks/reduxHook';
import {selectUser} from '@/store/slices/userSlice';
import {suggestionApi} from '@/api/external.api';

const MAX_LENGTH = 1000;

const SuggestionScreen = () => {
  const email = useAppSelector(selectUser).email;
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const trimmedMessage = message.trim();

  const submit = async () => {
    if (!trimmedMessage || loading) return;
    try {
      setLoading(true);
      const response = await suggestionApi({message: trimmedMessage, email});
      if (response.ok && response.data) {
        setMessage('');
        ToastNotification('success', 'Thanks — your suggestion was sent');
      } else {
        ToastNotification('error', response.data?.message || 'Couldn’t send your suggestion.');
      }
    } catch (error) {
      ToastNotification('error', error instanceof Error ? error.message : 'Couldn’t send your suggestion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen containerStyle={styles.screen}>
      <AppHeader label="Suggestions" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <AppText style={styles.eyebrow}>HELP SHAPE REEPLAY</AppText>
            <AppText style={styles.title}>Tell us what would make your experience better.</AppText>
          </View>

          <View style={styles.fieldGroup}>
            <AppText style={styles.label}>Your email</AppText>
            <View style={styles.emailField}>
              <AppText numberOfLines={1} style={styles.emailText}>{email || 'Email unavailable'}</AppText>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              maxLength={MAX_LENGTH}
              multiline
              textAlignVertical="top"
              placeholder="Share a feature request, content idea, or something you think we should improve."
              placeholderTextColor="#666B75"
              style={styles.input}
              accessibilityLabel="Your suggestion"
            />
            <AppText style={styles.count}>{message.length}/{MAX_LENGTH}</AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{disabled: !trimmedMessage || loading}}
            disabled={!trimmedMessage || loading}
            onPress={submit}
            style={({pressed}) => [
              styles.submit,
              (!trimmedMessage || loading) && styles.submitDisabled,
              pressed && styles.pressed,
            ]}>
            <AppText style={styles.submitText}>{loading ? 'Sending…' : 'Send suggestion  →'}</AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

export default SuggestionScreen;

const styles = StyleSheet.create({
  screen: {paddingTop: 10},
  flex: {flex: 1},
  content: {paddingBottom: 80, paddingTop: 26},
  intro: {marginTop: 8},
  eyebrow: {color: '#FF4B4F', fontFamily: 'MANROPE_700', fontSize: 10, letterSpacing: 1.4},
  title: {color: '#FFFFFF', fontFamily: 'LEXEND_700', fontSize: 22, lineHeight: 29, marginTop: 7},
  fieldGroup: {marginTop: 24},
  label: {color: '#E7E8EA', fontFamily: 'MANROPE_600', fontSize: 13, marginBottom: 9},
  count: {alignSelf: 'flex-end', color: '#747984', fontFamily: 'MANROPE_500', fontSize: 10, marginTop: 7},
  emailField: {height: 48, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: '#15171B', borderWidth: 1, borderColor: '#292C33'},
  emailText: {color: '#888D97', fontFamily: 'MANROPE_500', fontSize: 13},
  input: {minHeight: 170, borderRadius: 14, padding: 14, color: '#FFFFFF', fontFamily: 'MANROPE_400', fontSize: 14, lineHeight: 21, backgroundColor: '#121419', borderWidth: 1, borderColor: '#30333B'},
  submit: {height: 48, borderRadius: 24, marginTop: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F54343'},
  submitDisabled: {opacity: 0.4},
  submitText: {color: '#FFFFFF', fontFamily: 'MANROPE_700', fontSize: 14},
  pressed: {opacity: 0.78},
});
