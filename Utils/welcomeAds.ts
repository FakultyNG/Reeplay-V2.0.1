import {IAdsData} from '@/types/api/content.types';

export const getEligibleWelcomeAds = (
  ads: IAdsData[],
  now = Date.now(),
) =>
  ads.filter(ad => {
    const startsAt = new Date(ad.start).getTime();
    const expiresAt = new Date(ad.expiry).getTime();
    return (
      ad.type === 'mobile' &&
      ad.active !== false &&
      typeof ad.videoUrl === 'string' &&
      ad.videoUrl.trim().length > 0 &&
      Number.isFinite(startsAt) &&
      Number.isFinite(expiresAt) &&
      startsAt <= now &&
      expiresAt > now
    );
  });

export const getNextWelcomeAdIndex = (current: number, count: number) =>
  count > 0 ? (current + 1) % count : 0;
