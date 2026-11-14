import {Dispatch, SetStateAction} from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AppImage,
  AppText,
  AppView,
  TouchableOpacity,
} from '@/components';
import colors from '@/configs/colors';
import {CommentSendBtn} from '@/assets/icons';
import SmallCloseIcon from '@/assets/icons/small_close.svg';
import FastImage from 'react-native-fast-image';
import {BlurView as Blur} from '@react-native-community/blur';
import BlurView from 'react-native-blur-effect';
import {formatLikesNumber} from '@/Utils/formatAmount';
import {IReplyDetails} from '@/types/api/comment.types';
import PreviewComments from '../PreviewComments';
import fonts from '@/configs/fonts';

type Props = {
  commentCount: number;
  commentTxt: string;
  setCommentTxt: (v: string) => void;
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
  return (
    <AppView className="absolute z-30 w-full h-full">
      <AppView className="relative">
        {Platform.OS === 'android' ? (
          <AppView style={styles.blur}>
            <BlurView backgroundColor="rgba(0, 0, 0, 0.4)" blurRadius={20} />
          </AppView>
        ) : (
          <Blur blurType="dark" blurAmount={70} style={styles.blur} />
        )}

        <AppView className="absolute w-full h-full pt-[18px]">
          <AppView className="px-5">
            <AppText className="ml-3 font-ROBOTO_500 text-grey_200 text-[14px]">
              {formatLikesNumber(commentCount)} Comments
            </AppText>

            <AppView className="relative mt-4 w-full rounded-[30px] overflow-hidden bg-grey_900">
              {replyDetails && (
                <View className="h-12 w-full flex-row items-center justify-between px-5 bg-[#151414]">
                  <Text className="font-ROBOTO_400 text-grey_600">
                    Replying to @{replyDetails.name}
                  </Text>
                  <TouchableOpacity onPress={() => setRepliesDetails(null)}>
                    <SmallCloseIcon />
                  </TouchableOpacity>
                </View>
              )}
              <View
                className={`flex-row w-full p-[4px] ${
                  replyDetails ? 'pl-3' : ''
                }`}>
                <AppImage
                  style={{
                    width: 39,
                    height: 39,
                    borderRadius: 99,
                    marginRight: 10,
                  }}
                  className="w-[39px] h-[39px] rounded-full mr-3"
                  source={
                    userPic && userPic !== ''
                      ? {uri: userPic, priority: FastImage.priority.high}
                      : require('@/assets/images/default-user-profile.webp')
                  }
                />
                <TextInput
                  placeholder="Write a comment..."
                  placeholderTextColor="#C4C4C4C7"
                  cursorColor={colors.RED}
                  value={commentTxt}
                  onChangeText={setCommentTxt}
                  style={[styles.input, {flex: 1}]}
                />
                <TouchableOpacity
                  style={{alignSelf: 'center'}}
                  disabled={commentTxt === '' || loadingComment}
                  onPress={() => [Keyboard.dismiss(), addCommentFunc()]}
                  className="z-10 mr-4">
                  <CommentSendBtn />
                </TouchableOpacity>
              </View>
            </AppView>
          </AppView>

          <PreviewComments
            setRepliesDetails={setRepliesDetails}
            vodId={vodId}
            loadComment={loadingComment}
          />
        </AppView>
        <TouchableOpacity
          onPress={onClose}
          className="absolute bottom-0 z-40 w-full py-5 bg-[#1A1A1A]">
          <AppText className="text-center text-grey_200 font-ROBOTO_400">
            Close
          </AppText>
        </TouchableOpacity>
      </AppView>
    </AppView>
  );
};

export default PreviewCommentPanel;

const styles = StyleSheet.create({
  blur: {
    width: '100%',
    height: '100%',
  },
  input: {
    color: colors.WHITE,
    fontFamily: fonts.ROBOTO_400,
    fontSize: 14,
    paddingVertical: 10,
  },
});
