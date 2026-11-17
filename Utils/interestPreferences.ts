import {authGet, authRemove, authSet} from './authMmkv';

const GUEST_INTERESTS_KEY = 'guest.interest-preferences';

export type InterestPreferences = {
  genreIds: string[];
  categoryIds: string[];
};

export const emptyInterestPreferences = (): InterestPreferences => ({
  genreIds: [],
  categoryIds: [],
});

export async function getGuestInterestPreferences(): Promise<InterestPreferences> {
  const raw = await authGet(GUEST_INTERESTS_KEY);
  if (!raw) return emptyInterestPreferences();
  try {
    const parsed = JSON.parse(raw) as Partial<InterestPreferences>;
    return {
      genreIds: Array.isArray(parsed.genreIds) ? parsed.genreIds : [],
      categoryIds: Array.isArray(parsed.categoryIds) ? parsed.categoryIds : [],
    };
  } catch {
    return emptyInterestPreferences();
  }
}

export async function saveGuestInterestPreferences(
  preferences: InterestPreferences,
): Promise<void> {
  await authSet(GUEST_INTERESTS_KEY, JSON.stringify(preferences));
}

export async function clearGuestInterestPreferences(): Promise<void> {
  await authRemove(GUEST_INTERESTS_KEY);
}
