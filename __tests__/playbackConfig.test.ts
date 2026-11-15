jest.mock('react-native-video-cache', () => (url: string) => url);

import {
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
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
