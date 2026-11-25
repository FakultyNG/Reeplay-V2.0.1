import {
  cueTextAtTime,
  ensureWebVtt,
  normalizeSubtitleUrl,
  parseVttCues,
} from '../Utils/contentUtils';

describe('mobile subtitle parsing', () => {
  test('normalizes SRT and renders captions only inside their cue window', () => {
    const vtt = ensureWebVtt(
      '1\n00:00:01,000 --> 00:00:03,000\nHello Reeplay\n\n' +
        '2\n00:00:04,500 --> 00:00:06,000\nSecond caption',
    );
    const cues = parseVttCues(vtt);

    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(cues).toHaveLength(2);
    expect(cueTextAtTime(cues, 0.9)).toBe('');
    expect(cueTextAtTime(cues, 1.5)).toBe('Hello Reeplay');
    expect(cueTextAtTime(cues, 3.5)).toBe('');
    expect(cueTextAtTime(cues, 5)).toBe('Second caption');
    expect(cueTextAtTime(cues, 6)).toBe('');
  });

  test('accepts existing WebVTT and removes markup from overlay text', () => {
    const cues = parseVttCues(
      ensureWebVtt('WEBVTT\n\n00:01.000 --> 00:02.000\n<b>Caption</b>'),
    );

    expect(cues).toEqual([
      expect.objectContaining({start: 1, end: 2, text: 'Caption'}),
    ]);
  });

  test('uses the absolute subtitle URL returned by the backend', () => {
    expect(
      normalizeSubtitleUrl(
        'https://reeplay-media.example/subtitles/movie-english.vtt',
        'legacy-bucket',
        'legacy-key.vtt',
      ),
    ).toBe(
      'https://reeplay-media.example/subtitles/movie-english.vtt',
    );
  });

  test('parses production-style English and Yoruba WebVTT tracks', () => {
    const english = parseVttCues(
      'WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nWelcome to Reeplay.',
    );
    const yoruba = parseVttCues(
      'WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nẸ káàbọ̀ sí Reeplay.',
    );

    expect(cueTextAtTime(english, 2)).toBe('Welcome to Reeplay.');
    expect(cueTextAtTime(yoruba, 2)).toBe('Ẹ káàbọ̀ sí Reeplay.');
  });

  test('parses cue settings and exporters that omit blank lines', () => {
    const cues = parseVttCues(
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.000 align:center\nFirst\n' +
        '2\n00:00:02.000 --> 00:00:03.500 line:90%\nSecond &amp; final',
    );

    expect(cues).toEqual([
      {start: 1, end: 2, text: 'First'},
      {start: 2, end: 3.5, text: 'Second & final'},
    ]);
  });
});
