import {getPlayerLabels} from '../components/video/playerLabels';

describe('player labels', () => {
  test('uses series title and numbered episode context', () => {
    expect(
      getPlayerLabels(
        {
          title: 'The Long Road',
          seriesTitle: 'City Stories',
          seasonNumber: 1,
          episodeNumber: 5,
          episodeTitle: 'The Long Road',
          vidClass: 'premium',
        },
        'series',
      ),
    ).toEqual({
      title: 'City Stories',
      secondary: 'Season 1, Episode 5 · The Long Road',
    });
  });

  test('uses useful movie metadata without empty separators', () => {
    expect(
      getPlayerLabels(
        {
          title: 'Midnight Lagos',
          releaseYear: '2026-11-25T00:00:00.000Z',
          runtime: '1h 42m',
          vidClass: 'premium',
        },
        'vod',
      ),
    ).toEqual({
      title: 'Midnight Lagos',
      secondary: '2026 · 1h 42m · Premium',
    });
  });
});
