import {TouchableOpacity} from '@/components/';
import {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  isBiometrics?: boolean;
  isOn: boolean;
  setIsOn?: React.Dispatch<React.SetStateAction<boolean>>;
  onToggle?: (next: boolean) => void;
  disabled?: boolean;
}

const ToggleButton = ({isOn, setIsOn, onToggle, disabled}: Props) => {
  const animation = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{translateX: animation.value}],
    };
  });

  useEffect(() => {
    animation.value = withTiming(isOn ? 11.5 : 0, {duration: 250});
  }, [animation, isOn]);

  return (
    <TouchableOpacity
      className={`w-8 h-[19px] rounded-2xl pt-[1.5px] px-[2px] pb-[2.2px]  items-center flex-row ${
        isOn ? 'bg-red' : 'bg-[#bbbbbb]'
      }`}
      disabled={disabled}
      activeOpacity={1}
      style={{opacity: disabled ? 0.55 : 1}}
      onPress={() => onToggle ? onToggle(!isOn) : setIsOn?.(!isOn)}>
      <Animated.View style={[animatedStyle, styles.circle]} />
    </TouchableOpacity>
  );
};

export default ToggleButton;

const styles = StyleSheet.create({
  circle: {
    width: 16.5,
    height: 16.5,
    borderRadius: 17 / 2,
    backgroundColor: '#fff',
  },
});
