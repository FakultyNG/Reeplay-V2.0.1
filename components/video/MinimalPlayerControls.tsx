import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {MotiView} from 'moti';
import {Easing} from 'react-native-reanimated';
import {
  ArrowLeft,
  BigClose,
  BrightnessIcon,
  SeekBackIcon,
  SeekForwardIcon,
} from '@/assets/icons';
import EyesIcon from '@/assets/icons/eyes.svg';
import {formatLikesNumber} from '@/Utils/formatAmount';
import Casting from './controls/Casting';
import CTAButton from './controls/ctaButton';
import {DurationText, ProgressingDuration} from './controls/Durations';
import EpisodeNext from './controls/EpisodeNext';
import {Mute} from './controls/Mute';
import {PlayButton} from './controls/PlayButton';
import PlayerQuality from './controls/PlayerQuality';
import {Seekbar, SeekbarProps} from './controls/Seekbar';
import Subtitle from './controls/Subtitle';
import type {VideoPlayerProps} from 'react-native-video-player';
import BrightnessBar from '@/Screens/VideoScreen/components/BrightnessBar';

type Props = Partial<
  Omit<
    SeekbarProps,
    'customStyles' | 'onSeeking' | 'onSeek' | 'progress' | 'duration' | 'isPlaying' | 'isFullscreeen'
  >
> & {
  title: string;
  secondaryLabel: string;
  type?: string;
  duration: number;
  displayedProgress: number;
  actualProgress: number;
  isPlaying: boolean;
  isMuted: boolean;
  isLoading: boolean;
  isLiveNow: boolean;
  viewsCount: number;
  showDuration: VideoPlayerProps['showDuration'];
  customStyles?: VideoPlayerProps['customStyles'];
  onPlayPress: () => void;
  onMutePress: () => void;
  onExit: () => void;
  onSeek: (seconds: number) => void;
  onSeeking: (progress: number | null) => void;
  onSeekCommitted: (seconds: number) => void;
  handleNEXT?: () => void;
  handleCTAFunc?: () => void;
  ctaType?: 'vote' | 'donate';
  handleVideoCastingFunc?: () => void;
  subtitleTracks: {title: string; language: string}[];
  selectedSubtitleIndex: number;
  onSelectSubtitle?: (index: number) => void;
  onPickerOpenChange?: (open: boolean) => void;
  showQualityControl?: boolean;
  onBrightnessGestureStart?: () => void;
  onBrightnessGestureEnd?: () => void;
};

const MinimalPlayerControls = ({
  title,
  secondaryLabel,
  type,
  duration,
  displayedProgress,
  actualProgress,
  isPlaying,
  isMuted,
  isLoading,
  isLiveNow,
  viewsCount,
  showDuration,
  customStyles,
  onPlayPress,
  onMutePress,
  onExit,
  onSeek,
  onSeeking,
  onSeekCommitted,
  handleNEXT,
  handleCTAFunc,
  ctaType,
  handleVideoCastingFunc,
  subtitleTracks,
  selectedSubtitleIndex,
  onSelectSubtitle,
  onPickerOpenChange,
  showQualityControl = true,
  onBrightnessGestureStart,
  onBrightnessGestureEnd,
  ...seekbarProps
}: Props) => {
  const isSeries = type?.toLowerCase().includes('series') ?? false;
  const [brightLevel, setBrightLevel] = useState<number | null>(null);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.topScrim} pointerEvents="none" />
      <View style={styles.bottomScrim} pointerEvents="none" />

      <View style={styles.brightnessControl} pointerEvents="box-none">
        <View style={styles.brightnessIcon}>
          <BrightnessIcon />
        </View>
        <View style={styles.brightnessTrack}>
          <BrightnessBar
            brightLevel={brightLevel}
            setLevel={setBrightLevel}
            onGestureStart={onBrightnessGestureStart}
            onGestureEnd={onBrightnessGestureEnd}
          />
        </View>
      </View>

      <View style={styles.topBar}>
        <View style={styles.titleGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close player"
            hitSlop={14}
            style={styles.iconButton}
            onPress={onExit}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <View style={styles.titleCopy}>
            <Text numberOfLines={1} style={styles.title}>{title}</Text>
            <View style={styles.secondaryRow}>
              {isLiveNow && <View style={styles.liveDot} />}
              <Text
                numberOfLines={1}
                style={[styles.secondary, isLiveNow && styles.liveText]}>
                {secondaryLabel}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.topActions}>
          <Casting handleCastingFunc={handleVideoCastingFunc} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close player"
            hitSlop={14}
            style={styles.iconButton}
            onPress={onExit}>
            <BigClose />
          </Pressable>
        </View>
      </View>

      <View style={[styles.centerControls, isLoading && styles.loadingControls]}>
        {!isLiveNow && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rewind 10 seconds"
            hitSlop={20}
            style={styles.transportButton}
            onPress={() => onSeek(Math.max(displayedProgress * duration - 10, 0))}>
            <SeekBackIcon width={34} height={41} />
          </Pressable>
        )}
        <PlayButton
          minimal
          isPlaying={isPlaying}
          isFullscreen
          onPlayPress={onPlayPress}
        />
        {!isLiveNow && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forward 10 seconds"
            hitSlop={20}
            style={styles.transportButton}
            onPress={() => onSeek(Math.min(displayedProgress * duration + 10, duration))}>
            <SeekForwardIcon width={34} height={41} />
          </Pressable>
        )}
      </View>

      <View style={styles.bottomArea}>
        {isLiveNow ? (
          <View style={styles.liveStatusRow}>
            <View style={styles.livePill}>
              <MotiView
                from={{opacity: 0.3}}
                animate={{opacity: 1}}
                transition={{type: 'timing', duration: 900, easing: Easing.out(Easing.ease), loop: true}}>
                <View style={styles.pulseDot} />
              </MotiView>
              <Text style={styles.livePillText}>LIVE</Text>
            </View>
            <View style={styles.viewerCount}>
              <EyesIcon />
              <Text style={styles.viewerText}>{formatLikesNumber(viewsCount)} watching</Text>
            </View>
            <View style={styles.liveTrack} />
            <Text style={styles.liveEdgeText}>You’re live</Text>
          </View>
        ) : (
          <View style={styles.seekRow}>
            {showDuration && <DurationText duration={duration} />}
            <Seekbar
              {...seekbarProps}
              autoplay={seekbarProps.autoplay}
              disableSeek={seekbarProps.disableSeek}
              setIsPlaying={seekbarProps.setIsPlaying ?? (() => undefined)}
              showControls={seekbarProps.showControls ?? (() => undefined)}
              progress={displayedProgress}
              duration={duration}
              isPlaying={isPlaying}
              isFullscreeen
              onSeeking={onSeeking}
              onSeek={onSeekCommitted}
              seekBarBackgroundCustomStyles={customStyles?.seekBarBackground}
              seekBarCustomStyles={styles.seekbar}
              seekBarFullWidthCustomStyles={customStyles?.seekBarFullWidth}
              seekBarKnobCustomStyles={customStyles?.seekBarKnob}
              seekBarKnobSeekingCustomStyles={customStyles?.seekBarKnobSeeking}
              seekBarProgressCustomStyles={customStyles?.seekBarProgress}
            />
            {showDuration && (
              <ProgressingDuration progress={actualProgress} duration={duration} />
            )}
          </View>
        )}

        <View style={styles.bottomControls}>
          <View style={styles.controlGroup}>
            <Mute isMuted={isMuted} onMutePress={onMutePress} />
            {showQualityControl && (
              <PlayerQuality onOpenChange={onPickerOpenChange} />
            )}
          </View>
          <View style={styles.controlGroup}>
            {isSeries && <EpisodeNext onPress={handleNEXT} expanded />}
            {!isLiveNow && (
              <Subtitle
                tracks={subtitleTracks}
                selectedIndex={selectedSubtitleIndex}
                onSelect={index => onSelectSubtitle?.(index)}
                onOpenChange={onPickerOpenChange}
                compact
              />
            )}
            {ctaType && handleCTAFunc && (
              <CTAButton
                handleCTAFunc={handleCTAFunc}
                ctaType={ctaType}
                pill
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default MinimalPlayerControls;

const styles = StyleSheet.create({
  root: {...StyleSheet.absoluteFillObject, paddingHorizontal: 24, paddingVertical: 16},
  topScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 120,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  bottomScrim: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 150,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  titleGroup: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  iconButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  titleCopy: {flex: 1, marginLeft: 6},
  title: {color: '#FFFFFF', fontSize: 17, fontWeight: '700'},
  secondaryRow: {flexDirection: 'row', alignItems: 'center', marginTop: 3},
  secondary: {color: '#C4C4C4', fontSize: 12, fontWeight: '500'},
  liveText: {color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.7},
  liveDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF1313', marginRight: 6},
  topActions: {flexDirection: 'row', alignItems: 'center', gap: 5},
  centerControls: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 62,
  },
  brightnessControl: {
    position: 'absolute',
    left: 8,
    top: 52,
    bottom: 72,
    width: 56,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brightnessIcon: {alignSelf: 'center', marginBottom: 8},
  brightnessTrack: {height: 180, width: 56, alignItems: 'center'},
  loadingControls: {opacity: 0.35},
  transportButton: {width: 52, height: 52, alignItems: 'center', justifyContent: 'center'},
  bottomArea: {position: 'absolute', left: 24, right: 24, bottom: 12},
  seekRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8},
  seekbar: {marginBottom: 0, marginLeft: 0, marginRight: 0},
  bottomControls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  controlGroup: {flexDirection: 'row', alignItems: 'center', gap: 12},
  liveStatusRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  livePill: {
    height: 30, borderRadius: 15, backgroundColor: '#FF1313', paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pulseDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF'},
  livePillText: {color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.7},
  viewerCount: {flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: 14},
  viewerText: {color: '#FFFFFF', fontSize: 12},
  liveTrack: {height: 2, flex: 1, backgroundColor: '#FF1313', marginHorizontal: 16},
  liveEdgeText: {color: '#C4C4C4', fontSize: 11},
});
