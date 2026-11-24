import {useGuestAccessStore} from '@/store/guestAccess.store';

describe('guest login prompt', () => {
  beforeEach(() => {
    useGuestAccessStore.setState({
      isGuest: false,
      loginRequiredVisible: false,
      automaticLoginPromptShown: false,
    });
  });

  it('shows the automatic prompt only once per guest session', () => {
    const store = useGuestAccessStore.getState();
    store.setGuest(true);
    useGuestAccessStore.getState().showAutomaticLoginRequired();

    expect(useGuestAccessStore.getState().loginRequiredVisible).toBe(true);
    useGuestAccessStore.getState().hideLoginRequired();
    useGuestAccessStore.getState().showAutomaticLoginRequired();

    expect(useGuestAccessStore.getState().loginRequiredVisible).toBe(false);
  });

  it('still shows login prompts triggered by protected actions', () => {
    useGuestAccessStore.getState().setGuest(true);
    useGuestAccessStore.getState().showAutomaticLoginRequired();
    useGuestAccessStore.getState().hideLoginRequired();
    useGuestAccessStore.getState().showLoginRequired();

    expect(useGuestAccessStore.getState().loginRequiredVisible).toBe(true);
  });
});
