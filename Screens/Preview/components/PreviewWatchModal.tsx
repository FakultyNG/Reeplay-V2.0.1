import {StyleSheet} from 'react-native';
import {AppButton, AppText, AppView} from '@/components';
import AppModal from '@/components/AppModal';
import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import Size from '@/Utils/useResponsiveSize';
import routes from '@/navigation/routes';
import {RootNav} from '@/navigation/AppNavigator';
import {useNavigation} from '@react-navigation/native';

type Props = {
  visible: boolean;
  contentType: string;
  onClose: () => void;
};

const PreviewWatchModal = ({visible, contentType, onClose}: Props) => {
  const {navigate} = useNavigation<RootNav>();

  return (
    <AppModal
      isModalVisible={visible}
      style={{height: 390}}
      replaceDefaultContent={
        <AppView
          style={
            contentType === 'premium' && {marginTop: 8, marginBottom: -2}
          }
          className="items-center mt-3 mb-2">
          <AppText className="text-center font-ROBOTO_500 text-[15px] text-black">
            {contentType === 'exclusive' && 'Sorry this Content is not free.'}
            {contentType === 'premium' &&
              `You don’t have an active subscription`}
          </AppText>
          {contentType === 'premium' && (
            <AppText className="mt-4 mb-1 font-ROBOTO_700 text-[14px] text-black">
              TO WATCH PREMIUM
            </AppText>
          )}
          <AppText
            style={contentType === 'premium' && {marginBottom: 18}}
            className="text-center max-w-[80%] font-ROBOTO_400 text-[14px] text-black my-3 mb-4">
            {contentType === 'exclusive' &&
              'This is an Exclusive content, you must purchase to watch.'}
            {contentType === 'premium' &&
              'This is a Premium content, you must subscribe to watch.'}
          </AppText>
          {contentType === 'premium' && (
            <AppButton
              bgColor={colors.RED}
              title="Subscribe"
              onPress={() => [
                navigate(routes.MAIN, {
                  screen: routes.SUBSCRIPTION_SCREEN,
                  params: {tab: 'getSubscription'},
                }),
                onClose(),
              ]}
              style={styles.btn}
              labelStyle={styles.btnLabel}
            />
          )}
          {contentType === 'exclusive' && (
            <>
              <AppButton
                bgColor={colors.RED}
                title="₦300"
                onPress={() => [navigate(routes.PAYMENT_SCREEN), onClose()]}
                style={styles.btn}
                labelStyle={styles.btnLabel}
              />
              <AppButton
                bgColor={colors.DARK_GREY}
                title="Watch trailer"
                onPress={onClose}
                style={styles.btn}
                labelStyle={styles.btnLabel}
              />
            </>
          )}
        </AppView>
      }
      handleClose={onClose}
    />
  );
};

export default PreviewWatchModal;

const styles = StyleSheet.create({
  btnLabel: {
    fontFamily: fonts.ROBOTO_700,
    fontSize: 17,
    color: colors.GREY_100,
    marginLeft: 8,
    marginTop: 1,
  },
  btn: {
    width: Size.getWidth() * 0.4,
    paddingTop: Size.calcHeight(11),
    paddingBottom: Size.calcHeight(10),
    borderRadius: 4,
    marginVertical: 5,
  },
});
