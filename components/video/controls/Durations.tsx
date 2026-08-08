import { forwardRef, memo, useImperativeHandle, useState } from 'react';
import type { CustomStyles } from 'react-native-video-player';
import { StyleSheet, Text } from 'react-native';
import type { ProgressRef } from '../Controls';
import { formatDuration } from '@/Utils/formatVideoDuration';


export const ProgressingDuration = ({ duration,progress }:{duration:number,progress:number}) => {
  const safeSeconds =
    Number.isFinite(duration) && Number.isFinite(progress)
      ? Math.max(0, progress * duration)
      : Number.NaN;

  return (
    <Text className="text-white text-[13px] font-OUTFIT_500 w-[60px] ml-2.5 text-right">
      {formatDuration(safeSeconds)}
    </Text>
  );
}

export const DurationText = ({ duration }:{duration:number}) => {
    return (
      <>
         <Text className="text-white text-[13px] font-OUTFIT_500 w-[60px]">
      {formatDuration(Number.isFinite(duration) ? duration : Number.NaN)}
    </Text>
      </>
    );
  }
const styles = StyleSheet.create({
  durationText: {
    color: 'white',
  },
});
