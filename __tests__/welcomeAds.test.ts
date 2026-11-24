import {
  getEligibleWelcomeAds,
  getNextWelcomeAdIndex,
} from '@/Utils/welcomeAds';
import {IAdsData} from '@/types/api/content.types';

const now = new Date('2026-11-24T12:00:00.000Z').getTime();

const ad = (overrides: Partial<IAdsData> = {}): IAdsData => ({
  _id: '507f1f77bcf86cd799439011',
  title: 'Campaign',
  type: 'mobile',
  brand: 'Advertiser',
  link: 'https://example.com',
  duration: 0,
  start: '2026-11-23T12:00:00.000Z',
  expiry: '2026-11-25T12:00:00.000Z',
  active: true,
  createdAt: '2026-11-23T12:00:00.000Z',
  updatedAt: '2026-11-23T12:00:00.000Z',
  photoUrl: 'https://example.com/poster.jpg',
  videoUrl: 'https://example.com/ad.m3u8',
  cta: 'Learn more',
  ...overrides,
});

describe('welcome ad playback selection', () => {
  it('only selects active, current mobile ads with playable video URLs', () => {
    const eligible = getEligibleWelcomeAds(
      [
        ad(),
        ad({_id: 'inactive', active: false}),
        ad({_id: 'future', start: '2026-11-25T12:00:00.000Z'}),
        ad({_id: 'expired', expiry: '2026-11-24T11:59:59.000Z'}),
        ad({_id: 'blank', videoUrl: '  '}),
        ad({_id: 'home', type: 'home_ad'}),
      ],
      now,
    );

    expect(eligible.map(item => item._id)).toEqual([
      '507f1f77bcf86cd799439011',
    ]);
  });

  it('advances and wraps a remote playlist safely', () => {
    expect(getNextWelcomeAdIndex(0, 3)).toBe(1);
    expect(getNextWelcomeAdIndex(2, 3)).toBe(0);
    expect(getNextWelcomeAdIndex(0, 0)).toBe(0);
  });
});
