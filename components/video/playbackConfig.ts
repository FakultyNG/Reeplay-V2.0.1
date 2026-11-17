import {Platform} from 'react-native';
import convertToProxyURL from 'react-native-video-cache';
import type {BufferConfig, ReactVideoSource} from 'react-native-video';

export type PlaybackMode = 'vod' | 'live';

export function getYouTubeVideoId(uri: string): string | null {
  const match = uri.trim().match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
  );
  return match?.[1] ?? null;
}

export function getYouTubeEmbedUrl(uri: string): string | null {
  const videoId = getYouTubeVideoId(uri);
  if (!videoId) {
    return null;
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&controls=1&rel=0`;
}

/** Android ExoPlayer disk cache (MB). Global for the process; first positive value wins. */
const VOD_CACHE_SIZE_MB = 256;

export function isLiveNowPlayback(type?: string, isTime?: boolean): boolean {
  return type === 'live' && !!isTime;
}

export function getVodBufferConfig(): BufferConfig {
  return {
    minBufferMs: 15000,
    maxBufferMs: 50000,
    bufferForPlaybackMs: 2000,
    bufferForPlaybackAfterRebufferMs: 5000,
    backBufferDurationMs: 120000,
    maxHeapAllocationPercent: 0.4,
    minBufferMemoryReservePercent: 0.08,
    // Bias start toward a lower rung so first frame arrives sooner; ABR climbs after.
    initialBitrate: 1_500_000,
    cacheSizeMB: Platform.OS === 'android' ? VOD_CACHE_SIZE_MB : 0,
  };
}

export function getLiveBufferConfig(): BufferConfig {
  return {
    minBufferMs: 3000,
    maxBufferMs: 10000,
    bufferForPlaybackMs: 1500,
    bufferForPlaybackAfterRebufferMs: 2500,
    backBufferDurationMs: 0,
    cacheSizeMB: 0,
    initialBitrate: 1_200_000,
    live: {
      targetOffsetMs: 3500,
      minOffsetMs: 1500,
      maxOffsetMs: 8000,
      minPlaybackSpeed: 0.95,
      maxPlaybackSpeed: 1.05,
    },
  };
}

export function getBufferConfigForMode(mode: PlaybackMode): BufferConfig {
  return mode === 'live' ? getLiveBufferConfig() : getVodBufferConfig();
}

/** iOS AVPlayer preferred forward buffer (seconds). */
export function getPreferredForwardBufferDuration(mode: PlaybackMode): number {
  return mode === 'live' ? 3 : 12;
}

/**
 * Map Settings video_quality → maxBitRate (bps).
 * `automatic` / empty → 0 (no cap, full ABR).
 */
export function maxBitRateForQuality(quality?: string | null): number {
  const q = (quality ?? '').trim().toLowerCase();
  switch (q) {
    case '1080p':
      return 6_500_000;
    case '720p':
      return 3_500_000;
    case '480p':
      return 1_500_000;
    case 'automatic':
    case 'auto':
    case '':
      return 0;
    default:
      return 0;
  }
}

function isLocalUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('/') ||
    uri.startsWith('asset://')
  );
}

export function isHlsPlaybackUri(uri: string): boolean {
  const normalized = uri.toLowerCase();
  return normalized.includes('.m3u8') || normalized.includes('/media/hls/');
}

/**
 * Resolve stream URI + buffer policy.
 * Live HLS must never go through react-native-video-cache.
 */
export function resolvePlaybackSource(
  uri: string,
  mode: PlaybackMode = 'vod',
): ReactVideoSource {
  if (!uri) {
    return {
      uri: '',
      bufferConfig: getBufferConfigForMode(mode),
      minLoadRetryCount: 5,
    };
  }

  if (mode === 'live') {
    return {
      uri,
      type: 'm3u8',
      shouldCache: false,
      bufferConfig: getLiveBufferConfig(),
      minLoadRetryCount: 5,
    };
  }

  if (isLocalUri(uri)) {
    return {
      uri,
      shouldCache: false,
      bufferConfig: getVodBufferConfig(),
      minLoadRetryCount: 5,
    };
  }

  if (isHlsPlaybackUri(uri)) {
    return {
      uri,
      type: 'm3u8',
      shouldCache: false,
      bufferConfig: getVodBufferConfig(),
      minLoadRetryCount: 5,
    };
  }

  return {
    uri: convertToProxyURL(uri),
    shouldCache: true,
    bufferConfig: getVodBufferConfig(),
    minLoadRetryCount: 5,
  };
}
