import {create} from 'zustand';

type GuestAccessState = {
  enabled: boolean;
  isGuest: boolean;
  loginRequiredVisible: boolean;
  needsAuthRedirect: boolean;
  setEnabled: (enabled: boolean) => void;
  setGuest: (isGuest: boolean) => void;
  showLoginRequired: () => void;
  hideLoginRequired: () => void;
  requestAuthRedirect: () => void;
  clearAuthRedirect: () => void;
};

export const useGuestAccessStore = create<GuestAccessState>(set => ({
  enabled: false,
  isGuest: false,
  loginRequiredVisible: false,
  needsAuthRedirect: false,
  setEnabled: enabled => set({enabled}),
  setGuest: isGuest => set({isGuest}),
  showLoginRequired: () => set({loginRequiredVisible: true}),
  hideLoginRequired: () => set({loginRequiredVisible: false}),
  requestAuthRedirect: () => set({needsAuthRedirect: true}),
  clearAuthRedirect: () => set({needsAuthRedirect: false}),
}));
