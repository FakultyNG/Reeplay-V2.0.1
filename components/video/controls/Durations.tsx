import {StyleSheet, Text, View} from 'react-native';
import {formatDuration} from '@/Utils/formatVideoDuration';

/** Static slot for `HH:MM:SS` so labels cannot grow into the seek bar. */
const DURATION_SLOT_WIDTH = 80;

export const ProgressingDuration = ({
  duration,
  progress,
}: {
  duration: number;
  progress: number;
}) => {
  const safeSeconds =
    Number.isFinite(duration) && Number.isFinite(progress)
      ? Math.max(0, progress * duration)
      : Number.NaN;

  return (
    <View style={styles.slot}>
      <Text
        numberOfLines={1}
        className="text-white text-[13px] font-OUTFIT_500 text-right">
        {formatDuration(safeSeconds)}
      </Text>
    </View>
  );
};

export const DurationText = ({duration}: {duration: number}) => {
  return (
    <View style={styles.slot}>
      <Text numberOfLines={1} className="text-white text-[13px] font-OUTFIT_500">
        {formatDuration(Number.isFinite(duration) ? duration : Number.NaN)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  slot: {
    width: DURATION_SLOT_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
});
