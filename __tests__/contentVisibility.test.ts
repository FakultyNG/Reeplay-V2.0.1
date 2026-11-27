import {
  filterCategoryVodContent,
  filterGeneralVodContent,
  filterMusicVideoContent,
  isMusicVideoContent,
} from '@/Utils/contentVisibility';

const movie = {_id: 'movie', type: 'movie'} as const;
const series = {_id: 'series', type: 'series'} as const;
const music = {_id: 'music', type: 'music-video'} as const;

describe('music-video catalogue isolation', () => {
  it('recognizes normalized music-video types', () => {
    expect(isMusicVideoContent(music)).toBe(true);
    expect(isMusicVideoContent({...music, type: 'music video'})).toBe(true);
    expect(isMusicVideoContent(movie)).toBe(false);
  });

  it('removes music videos from general catalogue rows', () => {
    expect(filterGeneralVodContent([movie, music, series])).toEqual([
      movie,
      series,
    ]);
  });

  it('keeps only music videos in a music-video category', () => {
    expect(filterMusicVideoContent([movie, music, series])).toEqual([music]);
    expect(filterCategoryVodContent([movie, music], true)).toEqual([music]);
    expect(filterCategoryVodContent([movie, music], false)).toEqual([movie]);
  });
});
