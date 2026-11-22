import {
  getEpisodePlaybackUrl,
  normalizeSeriesSeasons,
} from '@/Utils/seriesContent';

describe('series content safety', () => {
  it('normalizes missing and malformed season payloads', () => {
    expect(normalizeSeriesSeasons(null)).toEqual([]);
    expect(
      normalizeSeriesSeasons([
        {_id: 'season-1', serial_number: 1, episodes: null},
        null,
        {serial_number: 2, episodes: []},
      ]),
    ).toEqual([
      expect.objectContaining({_id: 'season-1', episodes: []}),
    ]);
  });

  it('drops malformed episodes without dropping the season', () => {
    const seasons = normalizeSeriesSeasons([
      {
        _id: 'season-1',
        episodes: [null, {}, {_id: 'episode-1', video: 'https://example.test/master.m3u8'}],
      },
    ]);

    expect(seasons[0].episodes).toHaveLength(1);
    expect(seasons[0].episodes[0]._id).toBe('episode-1');
  });

  it('returns only a safe, trimmed episode URL', () => {
    expect(getEpisodePlaybackUrl({video: '  https://example.test/master.m3u8  '})).toBe(
      'https://example.test/master.m3u8',
    );
    expect(getEpisodePlaybackUrl({video: '', trailer: ' trailer.mp4 '})).toBe(
      'trailer.mp4',
    );
    expect(getEpisodePlaybackUrl(undefined)).toBe('');
  });
});
