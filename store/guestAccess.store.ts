import {create} from 'zustand';

type GuestAccessState = {
  enabled: boolean;
  isGuest: boolean;
  loginRequiredVisible: boolean;
  automaticLoginPromptShown: boolean;
  needsAuthRedirect: boolean;
  setEnabled: (enabled: boolean) => void;
  setGuest: (isGuest: boolean) => void;
  showLoginRequired: () => void;
  showAutomaticLoginRequired: () => void;
  hideLoginRequired: () => void;
  requestAuthRedirect: () => void;
  clearAuthRedirect: () => void;
};

export const useGuestAccessStore = create<GuestAccessState>(set => ({
  enabled: false,
  isGuest: false,
  loginRequiredVisible: false,
  automaticLoginPromptShown: false,
  needsAuthRedirect: false,
  setEnabled: enabled => set({enabled}),
  setGuest: isGuest =>
    set(state => ({
      isGuest,
      ...(state.isGuest !== isGuest && {automaticLoginPromptShown: false}),
    })),
  showLoginRequired: () => set({loginRequiredVisible: true}),
  showAutomaticLoginRequired: () =>
    set(state =>
      state.isGuest && !state.automaticLoginPromptShown
        ? {loginRequiredVisible: true, automaticLoginPromptShown: true}
        : state,
    ),
  hideLoginRequired: () => set({loginRequiredVisible: false}),
  requestAuthRedirect: () => set({needsAuthRedirect: true}),
  clearAuthRedirect: () => set({needsAuthRedirect: false}),
}));
