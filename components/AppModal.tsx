import Size from '@/Utils/useResponsiveSize';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  Text,
  ViewStyle,
  Platform,
} from 'react-native';
import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import {ModalLogo} from '@/assets/icons';
import BlurView from 'react-native-blur-effect';
import {BlurView as Blur} from '@react-native-community/blur';
import { JSX } from 'react';
import { useBackButtonHandler } from '@/Hooks/nativeBackFunc';

interface Props {
  isModalVisible: boolean;
  handleClose: () => void;
  replaceDefaultContent?: JSX.Element;
  hideLoge?: boolean;
  hideCloseBtn?: boolean;
  redCloseBtn?: boolean;
  style?: ViewStyle;
  LogoStyle?: ViewStyle;
  isView?:boolean
}

const AppModal = ({
  isModalVisible,
  handleClose,
  hideCloseBtn,
  hideLoge,
  replaceDefaultContent,
  style,
  LogoStyle,
  redCloseBtn,
  isView
}: Props): JSX.Element => {

  const renderComponent = () =>{
    return (
       <View style={[styles.modalContainer, {position: 'relative'}]}>
        <Pressable onPress={handleClose} style={styles.overlay}>
          {(
            <Blur
              style={{width: '100%', height: '100%'}}
              blurType="dark"
              blurAmount={2}
            />
          )}
        </Pressable>
        <View
          style={[
            {
              ...styles.modalContent,
              borderRadius: Size.calcAverage(6),
              width: '72%',
            },
            style,
          ]}>
          {!hideLoge && (
            <View style={LogoStyle}>
              <ModalLogo style={{marginVertical: 20}} />
            </View>
          )}

          {replaceDefaultContent && replaceDefaultContent}

          {!hideCloseBtn && (
            <TouchableOpacity
              style={[
                redCloseBtn && styles.btn,
                {marginTop: 20, marginBottom: 10},
              ]}
              onPress={handleClose}>
              <Text
                style={[
                  styles.secondaryModalButtonText,
                  redCloseBtn && {
                    color: 'white',
                    fontFamily: fonts.ROBOTO_700,
                  },
                ]}>
                Close
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  if(isView && isModalVisible){
    useBackButtonHandler(() => handleClose());
    return <View className='absolute h-full w-full'>
      {renderComponent()}
    </View>
  }
  return (
    <Modal
      animationType="fade"
      // transparent={true}
      visible={isModalVisible}
      onRequestClose={handleClose}>
           {renderComponent()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    // backgroundColor: '#00000099',
    height: '100%',
    width: '100%',
    position: 'absolute',
    // zIndex:-20
  },
  modalContainer: {
    height: Size.hp(100),
    width:Size.wp(100),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    margin: Size.calcAverage(20),
    marginLeft: Size.calcHeight(22),
    backgroundColor: colors.WHITE,
    padding: Size.calcAverage(20),
    alignItems: 'center',
    justifyContent: 'center',
    height: 368,
  },
  secondaryModalButtonText: {
    color: colors.DEEP_BLACK,
    fontFamily: fonts.ROBOTO_400,
    fontSize: Size.calcWidth(16),
  },
  btn: {
    backgroundColor: colors.RED,
    borderRadius: 4,
    paddingTop: 10,
    paddingHorizontal: 42,
    paddingBottom: 11,
  },
});

export default AppModal;
