# Resume: Auth storage + Home cache performance

**Paused:** 2026-07-29  
**Blocker:** Cannot fully test login / authenticated home flows — backend login issues. Resume after backend auth works again.

**Branch context:** `fix/kings` (RN 0.83.10 upgrade work also in tree).

---

## What was completed this session

### A. Auth rework (Keychain + MMKV + session modal)

| Piece | Location |
|-------|----------|
| Secure tokens (Keychain) | `Utils/secureTokenStorage.ts` — service `com.reeplay.auth.tokens` |
| Auth flags MMKV | `Utils/authMmkv.ts` |
| Token rotation (single-flight refresh) | `api/profile.api.ts` |
| Session expired (not persisted) | `store/zustand.store.ts` → `isSessionExpired` |
| Modal only on authenticated routes | `App.tsx` `PUBLIC_ROUTES` gate |
| AES Keychain isolated | `Screens/Preview/utils/downloadUtils.ts` — service `com.reeplay.aes` |

**Do not show Session Expired on:** Splash, Onboarding, Auth stack, GetStarted, Login, Signup, PIN, Interest, etc.

### B. Netflix-style home performance (MMKV + FastImage)

| Piece | Location |
|-------|----------|
| Content / home MMKV | `Utils/contentMmkv.ts` |
| Home snapshot hydrate + parallel boot APIs | `Screens/Home/HomeScreen.tsx` |
| Row cache SWR | `components/ContentWrapper.tsx` |
| FastImage immutable (no RNFS map) | `components/AppCategories.tsx` |
| Progressive sections / genre fetch | `Screens/Home/components/Sections.tsx`, `SwiperContainer.tsx` |
| Removed buggy GetStarted cache remap | `Screens/authentication/GetStartedScreen.tsx` |

**Why FastImage “didn’t work” before:** posters used `cacheControl.web` + custom `getCachedImage` (AsyncStorage + RNFS). Fixed to `cacheControl.immutable` + remote URI + `FastImage.preload`.

**WatermelonDB:** intentionally not used for this; MMKV snapshot + FastImage disk cache is the chosen approach.

### C. Onboarding (earlier)

Reverted custom pager experiments; back to `react-native-onboarding-swiper` with `goToPage` for Next. May still need UX verification after login works.

---

## Test plan when backend is back

1. **Login** — tokens land in Keychain; user/profile flags in auth MMKV (not AsyncStorage).
2. **Session modal** — force 401 / expire refresh on Home → modal appears; on Login/GetStarted → does **not** appear.
3. **Logout / delete account** — clears Keychain tokens + auth MMKV user/FCM/lock.
4. **Home cold open** — first launch after login may be network-bound; second open should paint from MMKV snapshot quickly; posters should warm from FastImage cache.
5. **Pull-to-refresh** — updates UI and rewrites home snapshot.
6. **Guest skip** (if still used) — guest token in Keychain only.

---

## Known caveats

- **2026-07-29 fix:** Session Expired right after login — `apiCall` no longer wipes the session on a lone 401 (that cleared fresh tokens during home boot). Session wipe only when refresh token is rejected. `armAuthGrace(60s)` after login ignores auth-failure side effects.
- Content caches migrated from AsyncStorage on first access; old AsyncStorage catalog keys should be cleared after migrate.
- Home still does a lot of work on first authenticated visit; progressive rows help after first paint.
- Unrelated AsyncStorage usage may remain (non-auth/non-home leftovers) — out of scope unless continuing cleanup.
- CodePush “invalid update / null bundle” noise appeared during debugging; prefer Metro/dev binary when testing local JS changes.

---

## Suggested resume prompts

- “Resume auth/cache session from `.cursor/RESUME-auth-perf.md` — backend is fixed, help me test.”
- “Continue AsyncStorage cleanup for remaining content keys.”
- “Tune home progressive loading / enum limit=1000.”
