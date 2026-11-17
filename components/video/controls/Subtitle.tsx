import React, {memo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {SubtitleIcon} from '@/assets/icons';

export type SubtitleTrackOption = {
  title: string;
  language: string;
};

interface SubtitleProps {
  tracks: SubtitleTrackOption[];
  selectedIndex: number; // -1 = Off
  onSelect: (index: number) => void;
  onOpenChange?: (open: boolean) => void;
  compact?: boolean;
}

const Subtitle = memo(
  ({tracks, selectedIndex, onSelect, onOpenChange, compact = false}: SubtitleProps) => {
  const [open, setOpen] = useState(false);
  const {height: windowHeight} = useWindowDimensions();
  const listMaxHeight = Math.min(windowHeight * 0.5, 360);

  const options = [
    {label: 'Off', index: -1},
    ...tracks.map((t, i) => ({
      label: t.title || t.language || `Track ${i + 1}`,
      index: i,
    })),
  ];

  const setPickerOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setPickerOpen(true)} style={styles.trigger}>
        <SubtitleIcon />
        <Text className="ml-[5px] font-ROBOTO_700 text-white text-[10px]">
          {compact ? 'CC' : 'Subtitle'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.root}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerOpen(false)}
          />

          <View style={styles.card}>
            <Text style={styles.title}>Subtitles</Text>

            {!tracks.length ? (
              <Text style={styles.empty}>
                No subtitles available for this title.
              </Text>
            ) : (
              <ScrollView
                style={{maxHeight: listMaxHeight}}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator
                bounces={false}>
                {options.map(opt => {
                  const active = opt.index === selectedIndex;
                  return (
                    <TouchableOpacity
                      key={`${opt.index}-${opt.label}`}
                      style={[styles.row, active && styles.rowActive]}
                      onPress={() => {
                        onSelect(opt.index);
                        setPickerOpen(false);
                      }}>
                      <Text
                        style={[
                          styles.rowText,
                          active && styles.rowTextActive,
                        ]}>
                        {active ? '✓  ' : '    '}
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.cancel}
              onPress={() => setPickerOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
});

export default Subtitle;

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  empty: {
    color: '#BDBDBD',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 18,
  },
  listContent: {
    paddingBottom: 4,
  },
  row: {
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rowActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rowText: {
    color: '#fff',
    fontSize: 15,
  },
  rowTextActive: {
    fontWeight: '700',
  },
  cancel: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#BDBDBD',
    fontSize: 15,
    fontWeight: '600',
  },
});
