jest.mock('react-native-video-cache', () => (url: string) => url);

import {
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
  resolvePlaybackSource,
  shouldAttachGoogleAd,
} from '../components/video/playbackConfig';

describe('YouTube playback URLs', () => {
  test.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extracts the video id from %s', (url, expected) => {
    expect(getYouTubeVideoId(url)).toBe(expected);
  });

  test('uses the privacy-enhanced YouTube embed host', () => {
    expect(getYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toContain(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  test('does not classify direct media URLs as YouTube', () => {
    expect(getYouTubeEmbedUrl('https://cdn.example.com/movie.mp4')).toBeNull();
  });
});

describe('stream source resolution', () => {
  test('plays HLS directly instead of routing it through the MP4 cache proxy', () => {
    expect(resolvePlaybackSource('https://api.example.com/media/hls/id/master.m3u8')).toEqual(
      expect.objectContaining({
        uri: 'https://api.example.com/media/hls/id/master.m3u8',
        type: 'm3u8',
        shouldCache: false,
      }),
    );
  });

  test('keeps live streams uncached even when their URL has no extension', () => {
    expect(resolvePlaybackSource('https://stream.example.com/live/channel', 'live')).toEqual(
      expect.objectContaining({
        uri: 'https://stream.example.com/live/channel',
        type: 'm3u8',
        shouldCache: false,
      }),
    );
  });
});

describe('Google ad placement', () => {
  it('allows ads for free main content', () => {
    expect(shouldAttachGoogleAd('free', true)).toBe(true);
  });

  it('never attaches ads to a free trailer or preview', () => {
    expect(shouldAttachGoogleAd('free', false)).toBe(false);
  });

  it('does not attach ads to paid main content', () => {
    expect(shouldAttachGoogleAd('premium', true)).toBe(false);
    expect(shouldAttachGoogleAd('exclusive', true)).toBe(false);
  });
});
