import React, {useCallback, useState} from 'react';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {AppText, AppView, TouchableOpacity} from '@/components';
import AppCategories from '@/components/AppCategories';
import {getPersonalizedContent} from '@/api/content.api';
import {useAppSelector} from '@/Hooks/reduxHook';
import {RootNav} from '@/navigation/AppNavigator';
import routes from '@/navigation/routes';
import {useGuestAccessStore} from '@/store/guestAccess.store';
import {selectUser} from '@/store/slices/userSlice';
import {IVODContent} from '@/types/api/content.types';
import {getGuestInterestPreferences} from '@/Utils/interestPreferences';
import Size from '@/Utils/useResponsiveSize';

const PersonalizedRow = ({title}: {title?: string}) => {
  const navigation = useNavigation<RootNav>();
  const user = useAppSelector(selectUser);
  const isGuest = useGuestAccessStore(state => state.isGuest);
  const [content, setContent] = useState<IVODContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPreferences, setHasPreferences] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        const local = isGuest ? await getGuestInterestPreferences() : null;
        const genreIds = isGuest
          ? local?.genreIds ?? []
          : user.settings_info?.interest_genres ?? [];
        const categoryIds = isGuest
          ? local?.categoryIds ?? []
          : user.settings_info?.interest_categories ?? [];
        if (!active) return;
        setHasPreferences(genreIds.length + categoryIds.length > 0);
        const response = await getPersonalizedContent({
          pagination: {page: 1, limit: 12},
          genreIds,
          categoryIds,
        });
        if (active && response.ok && response.data) setContent(response.data.data);
        if (active) setLoading(false);
      };
      load().catch(() => active && setLoading(false));
      return () => { active = false; };
    }, [isGuest, user.settings_info?.interest_categories, user.settings_info?.interest_genres]),
  );

  if (!loading && content.length === 0) return null;

  return (
    <AppView className="mt-8 pl-5">
      <AppCategories
        title={hasPreferences ? (title || 'Because of your interests') : 'Recommended for you'}
        btnText="EDIT"
        onPress={() => navigation.navigate(routes.INTEREST_SCREEN, {isSettings: true})}
        movieCategories={content}
        isLoading={loading}
        style={{marginRight: Size.calcHeight(12)}}
      />
      {!hasPreferences && (
        <TouchableOpacity
          onPress={() => navigation.navigate(routes.INTEREST_SCREEN, {isSettings: true})}
          className="mt-3 self-start rounded-full border border-red px-4 py-2">
          <AppText className="text-xs text-red font-MANROPE_600">
            Tune your recommendations
          </AppText>
        </TouchableOpacity>
      )}
    </AppView>
  );
};

export default PersonalizedRow;
