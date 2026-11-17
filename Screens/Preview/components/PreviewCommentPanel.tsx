import React, {Dispatch, SetStateAction} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CommentSendBtn} from '@/assets/icons';
import SmallCloseIcon from '@/assets/icons/small_close.svg';
import {AppImage, AppText, TouchableOpacity} from '@/components';
import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import {formatLikesNumber} from '@/Utils/formatAmount';
import {IReplyDetails} from '@/types/api/comment.types';
import PreviewComments from '../PreviewComments';

type Props = {
  commentCount: number;
  commentTxt: string;
  setCommentTxt: (value: string) => void;
  replyDetails: IReplyDetails | null;
  setRepliesDetails: Dispatch<SetStateAction<IReplyDetails | null>>;
  userPic?: string | null;
  vodId: string;
  loadingComment: boolean;
  addCommentFunc: () => void;
  onClose: () => void;
};

const PreviewCommentPanel = ({
  commentCount,
  commentTxt,
  setCommentTxt,
  replyDetails,
  setRepliesDetails,
  userPic,
  vodId,
  loadingComment,
  addCommentFunc,
  onClose,
}: Props) => {
  const insets = useSafeAreaInsets();
  const canSend = commentTxt.trim().length > 0 && !loadingComment;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close comments"
          style={styles.backdrop}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}>
          <View
            style={[
              styles.sheet,
              {paddingBottom: Math.max(insets.bottom, 10)},
            ]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View>
                <AppText style={styles.title}>Comments</AppText>
                <AppText style={styles.subtitle}>
                  {formatLikesNumber(commentCount)} in this conversation
                </AppText>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close comments"
                hitSlop={12}
                style={styles.closeButton}
                onPress={onClose}>
                <SmallCloseIcon width={14} height={14} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.listArea}>
              <PreviewComments
                setRepliesDetails={setRepliesDetails}
                vodId={vodId}
                loadComment={loadingComment}
              />
            </View>

            <View style={styles.composerArea}>
              {replyDetails && (
                <View style={styles.replyBanner}>
                  <AppText numberOfLines={1} style={styles.replyText}>
                    Replying to @{replyDetails.name}
                  </AppText>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Cancel reply"
                    hitSlop={10}
                    onPress={() => setRepliesDetails(null)}>
                    <SmallCloseIcon width={12} height={12} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.composerRow}>
                <AppImage
                  style={styles.avatar}
                  source={
                    userPic
                      ? {uri: userPic, priority: FastImage.priority.high}
                      : require('@/assets/images/default-user-profile.webp')
                  }
                />
                <View style={styles.inputShell}>
                  <TextInput
                    accessibilityLabel={replyDetails ? 'Write a reply' : 'Write a comment'}
                    placeholder={replyDetails ? 'Write a reply…' : 'Add a comment…'}
                    placeholderTextColor="#8B8B91"
                    cursorColor={colors.RED}
                    value={commentTxt}
                    onChangeText={setCommentTxt}
                    multiline
                    maxLength={1000}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={replyDetails ? 'Send reply' : 'Send comment'}
                    disabled={!canSend}
                    onPress={() => {
                      Keyboard.dismiss();
                      addCommentFunc();
                    }}
                    style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
                    {loadingComment ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <CommentSendBtn />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default PreviewCommentPanel;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '82%',
    minHeight: 480,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: '#2B2B30',
    backgroundColor: '#101013',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    marginTop: 10,
    borderRadius: 99,
    backgroundColor: '#3B3B40',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 13,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: fonts.ROBOTO_700,
    fontSize: 20,
  },
  subtitle: {
    marginTop: 3,
    color: '#929298',
    fontFamily: fonts.ROBOTO_400,
    fontSize: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#242428',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#29292E',
  },
  listArea: {
    flex: 1,
  },
  composerArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#303036',
    backgroundColor: '#151518',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#222226',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyText: {
    flex: 1,
    marginRight: 10,
    color: '#B8B8BE',
    fontFamily: fonts.ROBOTO_400,
    fontSize: 12,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 36,
    height: 36,
    marginBottom: 4,
    marginRight: 10,
    borderRadius: 18,
  },
  inputShell: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#34343A',
    borderRadius: 23,
    backgroundColor: '#202024',
    paddingLeft: 15,
    paddingRight: 5,
    paddingVertical: 4,
  },
  input: {
    maxHeight: 104,
    minHeight: 36,
    flex: 1,
    color: '#FFFFFF',
    fontFamily: fonts.ROBOTO_400,
    fontSize: 14,
    paddingBottom: 8,
    paddingTop: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.RED,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
