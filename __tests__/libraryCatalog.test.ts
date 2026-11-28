const mockPrimaryGet = jest.fn();
const mockPublishingGet = jest.fn();

jest.mock('apisauce', () => ({
  create: jest.fn(() => ({
    get: (...args: unknown[]) => mockPublishingGet(...args),
  })),
}));

jest.mock('@/api/profile.api', () => ({
  apiCall: jest.fn(async (request: (api: {get: typeof mockPrimaryGet}) => unknown) =>
    request({get: mockPrimaryGet}),
  ),
  getAuthToken: jest.fn(async () => undefined),
}));

jest.mock('@/store/guestAccess.store', () => ({
  useGuestAccessStore: {
    getState: () => ({isGuest: false}),
  },
}));

jest.mock('@/Utils/interestPreferences', () => ({
  getGuestInterestPreferences: jest.fn(async () => ({
    genreIds: [],
    categoryIds: [],
  })),
}));

import {getDefaultLibrary} from '@/api/content.api';

const movie = {_id: 'movie', type: 'movie', title: 'Movie'};
const music = {_id: 'music', type: 'music-video', title: 'Music'};

const response = (data: unknown[]) => ({
  ok: true,
  status: 200,
  data: {status: 200, message: 'ok', data},
});

describe('complete Library catalogue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPublishingGet.mockResolvedValue({ok: false, status: 404});
    mockPrimaryGet.mockImplementation(async (path: string) =>
      path.includes('type=music-video') ? response([music]) : response([movie]),
    );
  });

  it('merges general titles and music videos for All', async () => {
    const result = await getDefaultLibrary({
      pagination: {page: 1, limit: 20},
      filters: {sort: 'recommended'},
    });

    expect(result.data?.data.map(item => item._id)).toEqual(['movie', 'music']);
    expect(mockPrimaryGet).toHaveBeenCalledWith(
      expect.stringContaining('type=music-video'),
    );
  });

  it('keeps the Music tab isolated to music videos', async () => {
    const result = await getDefaultLibrary({
      pagination: {page: 1, limit: 20},
      filters: {type: 'music-video', sort: 'recommended'},
    });

    expect(result.data?.data.map(item => item._id)).toEqual(['music']);
    expect(mockPrimaryGet).toHaveBeenCalledTimes(1);
  });
});
