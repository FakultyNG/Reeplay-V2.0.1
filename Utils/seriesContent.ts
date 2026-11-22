import {ISeasonData} from '@/types/api/content.types';

export function getEpisodePlaybackUrl(
  episode:
    | {video?: string | null; trailer?: string | null}
    | null
    | undefined,
): string {
  const source = episode?.video || episode?.trailer;
  return typeof source === 'string' ? source.trim() : '';
}

export function normalizeSeriesSeasons(value: unknown): ISeasonData[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (season): season is ISeasonData =>
        Boolean(season) &&
        typeof season === 'object' &&
        typeof (season as ISeasonData)._id === 'string',
    )
    .map(season => ({
      ...season,
      episodes: Array.isArray(season.episodes)
        ? season.episodes.filter(
            episode =>
              Boolean(episode) &&
              typeof episode === 'object' &&
              typeof episode._id === 'string',
          )
        : [],
    }));
}
