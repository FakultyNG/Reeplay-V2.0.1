import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  AppView,
  TouchableOpacity,
} from '@/components';
import {fetchEnums} from '@/api/content.api';
import {getProfileDetails, replaceInterests} from '@/api/profile.api';
import colors from '@/configs/colors';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {RootNav} from '@/navigation/AppNavigator';
import routes from '@/navigation/routes';
import {useGuestAccessStore} from '@/store/guestAccess.store';
import {
  selectCategories,
  selectGenres,
  setCategories,
  setGenres,
} from '@/store/slices/bannerSlice.slice';
import {selectUser, setCredentials} from '@/store/slices/userSlice';
import {InterestScreenRouteProps} from '@/types/typings';
import {ICategoryData} from '@/types/api/content.types';
import {
  getGuestInterestPreferences,
  saveGuestInterestPreferences,
} from '@/Utils/interestPreferences';
import Size from '@/Utils/useResponsiveSize';

const MAX_INTERESTS = 7;

const uniqueIds = (ids: string[] | undefined) =>
  Array.from(new Set((ids ?? []).filter(Boolean)));

const InterestScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<RootNav>();
  const route = useRoute<InterestScreenRouteProps>();
  const user = useAppSelector(selectUser);
  const storedGenres = useAppSelector(selectGenres);
  const storedCategories = useAppSelector(selectCategories);
  const isGuest = useGuestAccessStore(state => state.isGuest);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedCount = genreIds.length + categoryIds.length;
  const selectedIds = useMemo(
    () => new Set([...genreIds, ...categoryIds]),
    [categoryIds, genreIds],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      const preferences = isGuest
        ? await getGuestInterestPreferences()
        : {
            genreIds: uniqueIds(user.settings_info?.interest_genres),
            categoryIds: uniqueIds(user.settings_info?.interest_categories),
          };

      let genres = storedGenres;
      let categories = storedCategories;
      if (genres.length === 0 || categories.length === 0) {
        const [genreResponse, categoryResponse] = await Promise.all([
          genres.length === 0 ? fetchEnums('genres') : null,
          categories.length === 0 ? fetchEnums('categories') : null,
        ]);
        const fetchedGenres = genreResponse?.data?.data;
        const fetchedCategories = categoryResponse?.data?.data;
        if (genreResponse?.ok && Array.isArray(fetchedGenres)) {
          genres = fetchedGenres;
          dispatch(setGenres(genres));
        }
        if (categoryResponse?.ok && Array.isArray(fetchedCategories)) {
          categories = fetchedCategories;
          dispatch(setCategories(categories));
        }
      }

      if (!active) return;
      let nextGenreIds = uniqueIds(preferences.genreIds);
      let nextCategoryIds = uniqueIds(preferences.categoryIds);
      if (!isGuest && nextGenreIds.length + nextCategoryIds.length === 0) {
        const legacyNames = new Set(
          (user.settings_info?.interest ?? []).map(name => name.trim().toLowerCase()),
        );
        nextGenreIds = genres
          .filter(item => legacyNames.has(item.name.toLowerCase()))
          .map(item => item._id);
        nextCategoryIds = categories
          .filter(item => legacyNames.has(item.name.toLowerCase()))
          .map(item => item._id);
      }
      setGenreIds(nextGenreIds);
      setCategoryIds(nextCategoryIds);
      if (genres.length === 0 && categories.length === 0) {
        setError('Interests could not be loaded. Please try again.');
      }
      setLoadingOptions(false);
    };

    load().catch(() => {
      if (active) {
        setError('Interests could not be loaded. Please try again.');
        setLoadingOptions(false);
      }
    });

    return () => {
      active = false;
    };
  }, [dispatch, isGuest, storedCategories, storedGenres, user.settings_info]);

  const toggleInterest = (id: string, type: 'genre' | 'category') => {
    const setter = type === 'genre' ? setGenreIds : setCategoryIds;
    setter(currentIds => {
      if (currentIds.includes(id)) {
        setError('');
        return currentIds.filter(currentId => currentId !== id);
      }
      if (selectedIds.size >= MAX_INTERESTS) {
        setError(`Choose up to ${MAX_INTERESTS} interests.`);
        return currentIds;
      }
      setError('');
      return [...currentIds, id];
    });
  };

  const saveInterests = async () => {
    setSaving(true);
    setError('');
    try {
      const preferences = {genreIds, categoryIds};
      if (isGuest) {
        await saveGuestInterestPreferences(preferences);
      } else {
        const response = await replaceInterests(preferences);
        if (!response.ok) {
          setError(response.data?.message ?? 'Interests could not be saved.');
          return;
        }
        const profileResponse = await getProfileDetails();
        if (profileResponse.ok && profileResponse.data) {
          dispatch(setCredentials(profileResponse.data.data));
        }
      }

      if (route.params?.isSettings) {
        Alert.alert('Settings', 'Interests have been updated.');
        navigation.goBack();
      } else {
        navigation.reset({index: 0, routes: [{name: routes.TAB_MAIN}]});
      }
    } catch {
      setError('Interests could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderOptions = (
    title: string,
    options: ICategoryData[],
    type: 'genre' | 'category',
  ) => (
    <AppView className="mt-6">
      <AppText className="text-white text-lg font-LEXEND_600 mb-3">
        {title}
      </AppText>
      <AppView className="flex-row gap-y-4 gap-x-3 flex-wrap">
        {options.map(option => {
          const selected = selectedIds.has(option._id);
          return (
            <TouchableOpacity
              key={option._id}
              onPress={() => toggleInterest(option._id, type)}
              activeOpacity={1}
              accessibilityRole="checkbox"
              accessibilityState={{checked: selected}}
              style={[
                styles.option,
                {backgroundColor: selected ? colors.RED : colors.WHITE},
              ]}>
              <AppText
                className="text-sm font-MANROPE_500"
                style={{color: selected ? colors.WHITE : colors.GREY_600}}>
                {option.name}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </AppView>
    </AppView>
  );

  return (
    <AppScreen containerStyle={styles.screen}>
      <AppHeader label="Your interests" />
      <AppText className="text-xs text-red font-LEXEND_700 tracking-[2px] mt-9">
        PERSONALISE REEPLAY
      </AppText>
      <AppText className="text-3xl text-white font-LEXEND_700 mt-2">
        What do you enjoy?
      </AppText>
      <AppText className="text-base text-grey_100 font-MANROPE_400 mt-2">
        Pick up to {MAX_INTERESTS}. We will prioritise relevant titles while
        keeping discovery fresh.
      </AppText>
      <AppText className="text-sm text-grey_100 font-MANROPE_500 mt-3">
        {selectedCount}/{MAX_INTERESTS} selected
      </AppText>

      {error.length > 0 && (
        <AppText className="text-red text-sm font-MANROPE_500 mt-3">
          {error}
        </AppText>
      )}

      {loadingOptions ? (
        <AppView className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.RED} size="large" />
        </AppView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.optionsContainer}>
          {renderOptions('Genres', storedGenres, 'genre')}
          {renderOptions('Categories', storedCategories, 'category')}
        </ScrollView>
      )}

      <AppView className="pb-3 pt-2">
        <AppButton
          isDisable={
            loadingOptions || (!route.params?.isSettings && selectedCount === 0)
          }
          isLoading={saving}
          bgColor={colors.RED}
          title={route.params?.isSettings ? 'Save preferences' : 'Continue'}
          onPress={saveInterests}
          style={styles.button}
        />
        {!route.params?.isSettings && (
          <Pressable
            onPress={() =>
              navigation.reset({index: 0, routes: [{name: routes.TAB_MAIN}]})
            }
            style={styles.skip}>
            <AppText className="text-lg text-grey_700 font-MANROPE_400 text-center">
              Skip
            </AppText>
          </Pressable>
        )}
      </AppView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {position: 'relative'},
  optionsContainer: {paddingBottom: 24},
  option: {paddingHorizontal: 22, paddingVertical: 14, borderRadius: 24},
  button: {borderRadius: 8, width: '100%'},
  skip: {marginTop: Size.calcHeight(16)},
});

export default InterestScreen;
