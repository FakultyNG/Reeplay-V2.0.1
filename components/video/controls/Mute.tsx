import {memo} from 'react';
import {Pressable, View} from 'react-native';
import {MutedIcon, VolumeIcon} from '@/assets/icons';

interface MuteProps {
  isMuted: boolean;
  onMutePress: () => void;
}

export const Mute = memo(({isMuted, onMutePress}: MuteProps) => {
  return (
    <Pressable
      onPress={onMutePress}
      hitSlop={14}
      className="h-[28px] w-[28px] mb-1 items-center justify-center"
      style={({pressed}) => ({opacity: pressed ? 0.65 : 1})}>
      {isMuted ? (
        <View className="mt-[3px]">
          <MutedIcon />
        </View>
      ) : (
        <VolumeIcon />
      )}
    </Pressable>
  );
});
