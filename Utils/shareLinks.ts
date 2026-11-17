import {BASE_URL} from '@env';

export type ShareEntityType =
  | 'vod'
  | 'movie'
  | 'series'
  | 'music-video'
  | 'skit'
  | 'cast'
  | 'live';

const publicOrigin = BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export const buildShareUrl = (
  type: ShareEntityType | string,
  id: string,
  params?: Record<string, string | undefined>,
) => {
  const query = Object.entries(params ?? {})
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return `${publicOrigin}/share/${encodeURIComponent(type)}/${encodeURIComponent(id)}${query ? `?${query}` : ''}`;
};

export const parseShareDeepLink = (url: string) => {
  const match = url.match(/^reeplay:\/\/share\/([^/?#]+)\/([^/?#]+)(?:\?([^#]+))?/i);
  if (!match) return null;
  const params = Object.fromEntries(
    (match[3] ?? '')
      .split('&')
      .filter(Boolean)
      .map(item => {
        const [key, value = ''] = item.split('=');
        return [decodeURIComponent(key), decodeURIComponent(value)];
      }),
  );
  return {
    type: decodeURIComponent(match[1]),
    id: decodeURIComponent(match[2]),
    params,
  };
};
