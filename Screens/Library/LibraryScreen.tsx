import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useNavigation} from '@react-navigation/native';
import {SearchIcon} from '@/assets/icons';
import {AppImage, AppScreen, AppText} from '@/components';
import Placeholder from '@/components/SkeletonLoader';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {previewContentType, RootNav} from '@/navigation/AppNavigator';
import routes from '@/navigation/routes';
import {useTabBarCompactOnScroll} from '@/navigation/useTabBarCompactOnScroll';
import {getDefaultLibrary, type LibraryFilters} from '@/api/content.api';
import {selectCategories, selectGenres} from '@/store/slices/bannerSlice.slice';
import {setPreviewContent} from '@/store/slices/previewContentSlice';
import type {ICategoryData, IVODContent} from '@/types/api/content.types';

const PAGE_SIZE = 20;
type ContentType = LibraryFilters['type'] | 'all';
type AccessType = LibraryFilters['access'] | 'all';
type SortType = NonNullable<LibraryFilters['sort']>;

const TYPE_OPTIONS: {label: string; value: ContentType}[] = [
  {label: 'All', value: 'all'},
  {label: 'Movies', value: 'movie'},
  {label: 'Series', value: 'series'},
  {label: 'Music', value: 'music-video'},
  {label: 'Skits', value: 'skit'},
];
const ACCESS_OPTIONS: {label: string; value: AccessType}[] = [
  {label: 'All access', value: 'all'},
  {label: 'Free', value: 'free'},
  {label: 'Premium', value: 'premium'},
  {label: 'Reeplay Originals', value: 'original'},
];
const SORT_OPTIONS: {label: string; value: SortType}[] = [
  {label: 'Recommended', value: 'recommended'},
  {label: 'Newest', value: 'newest'},
  {label: 'Most watched', value: 'popular'},
  {label: 'A–Z', value: 'az'},
];
type AppliedFilters = {
  access: AccessType;
  genreId: string;
  categoryId: string;
  sort: SortType;
};
const DEFAULT_FILTERS: AppliedFilters = {
  access: 'all',
  genreId: '',
  categoryId: '',
  sort: 'recommended',
};

const LibraryScreen = () => {
  const {width} = useWindowDimensions();
  const {reportScrollOffset} = useTabBarCompactOnScroll();
  const genres = useAppSelector(selectGenres);
  const categories = useAppSelector(selectCategories);
  const [contentType, setContentType] = useState<ContentType>('all');
  const [filters, setFilters] = useState<AppliedFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [contents, setContents] = useState<IVODContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const loadingMoreRef = useRef(false);
  const cardWidth = Math.max(140, (width - 52) / 2);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const apiFilters = useMemo<LibraryFilters>(() => ({
    search: debouncedSearch || undefined,
    type: contentType === 'all' ? undefined : contentType,
    access: filters.access === 'all' ? undefined : filters.access,
    genreId: filters.genreId || undefined,
    categoryId: filters.categoryId || undefined,
    sort: filters.sort,
  }), [contentType, debouncedSearch, filters]);

  const fetchPage = useCallback(async (targetPage: number, replace: boolean) => {
    if (!replace && loadingMoreRef.current) return;
    const currentRequest = replace ? ++requestId.current : requestId.current;
    if (replace) setLoading(true);
    else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    setError('');
    try {
      const response = await getDefaultLibrary({
        pagination: {page: targetPage, limit: PAGE_SIZE},
        filters: apiFilters,
      });
      if (currentRequest !== requestId.current) return;
      if (!response.ok || !response.data) {
        throw new Error(response.data?.message || 'Library could not be loaded.');
      }
      const incoming = Array.isArray(response.data.data) ? response.data.data : [];
      setContents(previous => {
        if (replace) return incoming;
        const merged = new Map(previous.map(item => [item._id, item]));
        incoming.forEach(item => merged.set(item._id, item));
        return Array.from(merged.values());
      });
      setPage(targetPage);
      setHasMore(incoming.length >= PAGE_SIZE);
    } catch (fetchError) {
      if (currentRequest === requestId.current) {
        setError(fetchError instanceof Error ? fetchError.message : 'Library could not be loaded.');
        if (replace) setContents([]);
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [apiFilters]);

  useEffect(() => {
    setHasMore(true);
    setPage(1);
    fetchPage(1, true).catch(() => undefined);
  }, [apiFilters, fetchPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    await fetchPage(1, true);
    setRefreshing(false);
  }, [fetchPage]);

  const activeFilterCount = [
    filters.access !== 'all',
    Boolean(filters.genreId),
    Boolean(filters.categoryId),
    filters.sort !== 'recommended',
  ].filter(Boolean).length;

  return (
    <AppScreen containerStyle={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.heading}>
        <AppText style={styles.eyebrow}>EXPLORE</AppText>
        <AppText style={styles.headingTitle}>Library</AppText>
        <AppText style={styles.headingCopy}>Movies, series, music videos and more—all in one place.</AppText>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <SearchIcon width={18} height={18} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search titles"
            placeholderTextColor="#777C87"
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
            accessibilityLabel="Search library titles"
          />
          {search ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setSearch('')}>
              <AppText style={styles.clearSearch}>×</AppText>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
          onPress={() => {
            setDraftFilters(filters);
            setFilterOpen(true);
          }}
          style={({pressed}) => [styles.filterButton, pressed && styles.pressed]}>
          <AppText style={styles.filterButtonText}>Filters</AppText>
          {activeFilterCount ? (
            <View style={styles.filterCount}>
              <AppText style={styles.filterCountText}>{activeFilterCount}</AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeTabs}>
        {TYPE_OPTIONS.map(option => (
          <FilterChip key={option.value} label={option.label} selected={contentType === option.value} onPress={() => setContentType(option.value)} />
        ))}
      </ScrollView>

      <View style={styles.resultsRow}>
        <AppText style={styles.resultsText}>{loading ? 'Loading titles…' : `${contents.length} title${contents.length === 1 ? '' : 's'}`}</AppText>
        {(debouncedSearch || activeFilterCount || contentType !== 'all') ? (
          <Pressable onPress={() => {
            setSearch('');
            setContentType('all');
            setFilters(DEFAULT_FILTERS);
          }}>
            <AppText style={styles.resetInline}>Clear all</AppText>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={loading ? Array.from({length: 6}, (_, index) => ({_id: `skeleton-${index}`} as IVODContent)) : contents}
        keyExtractor={item => item._id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={event => reportScrollOffset(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && hasMore) fetchPage(page + 1, false).catch(() => undefined);
        }}
        refreshing={refreshing}
        onRefresh={refresh}
        renderItem={({item}) => loading ? (
          <View style={{width: cardWidth}}>
            <Placeholder style={{...styles.poster, width: cardWidth}} />
            <Placeholder style={styles.skeletonTitle} />
          </View>
        ) : <ContentItem item={item} width={cardWidth} />}
        ListEmptyComponent={!loading ? <EmptyLibrary error={error} onRetry={() => fetchPage(1, true).catch(() => undefined)} /> : null}
        ListFooterComponent={loadingMore ? (
          <View style={styles.footerLoader}><ActivityIndicator color="#FF3B3F" /></View>
        ) : null}
      />

      <FilterSheet
        visible={filterOpen}
        filters={draftFilters}
        genres={genres}
        categories={categories}
        onChange={setDraftFilters}
        onClose={() => setFilterOpen(false)}
        onApply={() => {
          setFilters(draftFilters);
          setFilterOpen(false);
        }}
      />
    </AppScreen>
  );
};

const FilterChip = ({label, selected, onPress}: {label: string; selected: boolean; onPress: () => void}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{selected}}
    onPress={onPress}
    style={({pressed}) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
    <AppText style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</AppText>
  </Pressable>
);

const FilterSection = ({title, children}: {title: string; children: React.ReactNode}) => (
  <View style={styles.filterSection}>
    <AppText style={styles.filterSectionTitle}>{title}</AppText>
    <View style={styles.filterChoices}>{children}</View>
  </View>
);

const FilterSheet = ({visible, filters, genres, categories, onChange, onClose, onApply}: {
  visible: boolean;
  filters: AppliedFilters;
  genres: ICategoryData[];
  categories: ICategoryData[];
  onChange: (filters: AppliedFilters) => void;
  onClose: () => void;
  onApply: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalRoot}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View>
            <AppText style={styles.sheetTitle}>Filter library</AppText>
            <AppText style={styles.sheetSubtitle}>Narrow titles to what you want to watch.</AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} hitSlop={12}>
            <AppText style={styles.sheetClose}>×</AppText>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
          <FilterSection title="Access">
            {ACCESS_OPTIONS.map(option => (
              <FilterChip key={option.value} label={option.label} selected={filters.access === option.value} onPress={() => onChange({...filters, access: option.value})} />
            ))}
          </FilterSection>
          <FilterSection title="Sort by">
            {SORT_OPTIONS.map(option => (
              <FilterChip key={option.value} label={option.label} selected={filters.sort === option.value} onPress={() => onChange({...filters, sort: option.value})} />
            ))}
          </FilterSection>
          <FilterSection title="Genre">
            <FilterChip label="All genres" selected={!filters.genreId} onPress={() => onChange({...filters, genreId: ''})} />
            {genres.map(item => (
              <FilterChip key={item._id} label={item.name} selected={filters.genreId === item._id} onPress={() => onChange({...filters, genreId: item._id})} />
            ))}
          </FilterSection>
          <FilterSection title="Category">
            <FilterChip label="All categories" selected={!filters.categoryId} onPress={() => onChange({...filters, categoryId: ''})} />
            {categories.map(item => (
              <FilterChip key={item._id} label={item.name} selected={filters.categoryId === item._id} onPress={() => onChange({...filters, categoryId: item._id})} />
            ))}
          </FilterSection>
        </ScrollView>
        <View style={styles.sheetActions}>
          <Pressable onPress={() => onChange(DEFAULT_FILTERS)} style={({pressed}) => [styles.resetButton, pressed && styles.pressed]}>
            <AppText style={styles.resetButtonText}>Reset</AppText>
          </Pressable>
          <Pressable onPress={onApply} style={({pressed}) => [styles.applyButton, pressed && styles.pressed]}>
            <AppText style={styles.applyButtonText}>Show results</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const contentPreviewType = (type: string) => {
  if (type === 'series') return previewContentType['tv series'];
  if (type === 'music-video') return previewContentType['music video'];
  return previewContentType.film;
};

export const ContentItem = ({item, width}: {item: IVODContent; width: number}) => {
  const {navigate} = useNavigation<RootNav>();
  const dispatch = useAppDispatch();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const year = item.releaseDate ? String(item.releaseDate).slice(0, 4) : '';
  const typeLabel = item.type === 'series' ? 'Series' : item.type === 'music-video' ? 'Music video' : item.type === 'skit' ? 'Skit' : 'Movie';
  const accessLabel = item.isReeplayOriginal ? 'ORIGINAL' : item.vidClass === 'premium' ? 'PREMIUM' : 'FREE';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${typeLabel}`}
      onPress={() => {
        dispatch(setPreviewContent(item));
        navigate(routes.PREVIEW_SCREEN, {content: contentPreviewType(item.type), videoURL: item.trailer});
      }}
      style={({pressed}) => [styles.card, {width}, pressed && styles.cardPressed]}>
      <View style={[styles.posterWrap, {width}]}>
        {imageLoading && !imageFailed ? <Placeholder style={{...styles.poster, width}} /> : null}
        {imageFailed ? (
          <View style={[styles.imageFallback, {width}]}>
            <AppText style={styles.imageFallbackText}>{item.title.slice(0, 1).toUpperCase()}</AppText>
          </View>
        ) : (
          <AppImage
            source={{uri: item.portraitPhoto, priority: FastImage.priority.normal}}
            style={[styles.poster, {width}]}
            resizeMode={FastImage.resizeMode.cover}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageFailed(true);
            }}
          />
        )}
        <View style={[styles.accessBadge, item.vidClass === 'free' && styles.freeBadge]}>
          <AppText style={styles.accessBadgeText}>{accessLabel}</AppText>
        </View>
      </View>
      <AppText numberOfLines={2} style={styles.cardTitle}>{item.title}</AppText>
      <AppText numberOfLines={1} style={styles.cardMeta}>{[typeLabel, year].filter(Boolean).join(' · ')}</AppText>
    </Pressable>
  );
};

const EmptyLibrary = ({error, onRetry}: {error: string; onRetry: () => void}) => (
  <View style={styles.emptyState}>
    <AppText style={styles.emptyTitle}>{error ? 'Library unavailable' : 'No titles found'}</AppText>
    <AppText style={styles.emptyCopy}>{error || 'Try removing a filter or searching with a different title.'}</AppText>
    <Pressable onPress={onRetry} style={styles.emptyButton}>
      <AppText style={styles.emptyButtonText}>{error ? 'Try again' : 'Refresh'}</AppText>
    </Pressable>
  </View>
);

export default LibraryScreen;

const styles = StyleSheet.create({
  screen: {paddingTop: 4},
  heading: {paddingTop: 8, paddingBottom: 18},
  eyebrow: {color: '#FF4B4F', fontSize: 11, fontWeight: '700', letterSpacing: 1.7},
  headingTitle: {color: '#FFFFFF', fontSize: 30, fontWeight: '700', marginTop: 3},
  headingCopy: {color: '#9297A2', fontSize: 13, marginTop: 5},
  searchRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  searchBox: {height: 48, flex: 1, borderRadius: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#14161B', borderWidth: 1, borderColor: '#242730'},
  searchInput: {flex: 1, height: '100%', padding: 0, color: '#FFFFFF', fontSize: 14},
  clearSearch: {color: '#A4A8B1', fontSize: 24, lineHeight: 26},
  filterButton: {height: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#1B1D23', borderWidth: 1, borderColor: '#30333C', flexDirection: 'row', alignItems: 'center', gap: 7},
  filterButtonText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},
  filterCount: {minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#FF3438', alignItems: 'center', justifyContent: 'center'},
  filterCountText: {color: '#FFFFFF', fontSize: 10, fontWeight: '700'},
  typeTabs: {gap: 8, paddingVertical: 14, paddingRight: 20},
  chip: {minHeight: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: '#2D3038', backgroundColor: '#121419', alignItems: 'center', justifyContent: 'center'},
  chipSelected: {borderColor: '#FF3438', backgroundColor: '#FF3438'},
  chipText: {color: '#A7ABB4', fontSize: 12, fontWeight: '600'},
  chipTextSelected: {color: '#FFFFFF'},
  pressed: {opacity: 0.72},
  resultsRow: {height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  resultsText: {color: '#7E838E', fontSize: 12},
  resetInline: {color: '#FF5559', fontSize: 12, fontWeight: '600'},
  listContent: {paddingTop: 8, paddingBottom: 120, flexGrow: 1},
  gridRow: {justifyContent: 'space-between', marginBottom: 22},
  card: {minWidth: 0},
  cardPressed: {opacity: 0.78, transform: [{scale: 0.985}]},
  posterWrap: {aspectRatio: 0.68, overflow: 'hidden', borderRadius: 14, backgroundColor: '#15171C'},
  poster: {height: '100%', borderRadius: 14, backgroundColor: '#15171C'},
  skeletonTitle: {width: '72%', height: 14, marginTop: 10, borderRadius: 7},
  imageFallback: {height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#20232A'},
  imageFallbackText: {color: '#4A4F5A', fontSize: 42, fontWeight: '700'},
  accessBadge: {position: 'absolute', top: 9, left: 9, minHeight: 23, paddingHorizontal: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E92E33'},
  freeBadge: {backgroundColor: 'rgba(16,18,22,0.88)'},
  accessBadgeText: {color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5},
  cardTitle: {color: '#F6F6F7', fontSize: 14, lineHeight: 19, fontWeight: '600', marginTop: 9},
  cardMeta: {color: '#7E838E', fontSize: 11, marginTop: 4},
  footerLoader: {height: 70, alignItems: 'center', justifyContent: 'center'},
  emptyState: {flex: 1, minHeight: 340, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center'},
  emptyTitle: {color: '#FFFFFF', fontSize: 19, fontWeight: '700', textAlign: 'center'},
  emptyCopy: {color: '#898E99', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8},
  emptyButton: {marginTop: 18, height: 42, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#FF3438', alignItems: 'center', justifyContent: 'center'},
  emptyButtonText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700'},
  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  modalBackdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)'},
  sheet: {maxHeight: '88%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#101217', borderWidth: 1, borderColor: '#262931', paddingHorizontal: 20, paddingBottom: 20},
  sheetHandle: {alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#3C4049', marginTop: 10, marginBottom: 14},
  sheetHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#24272E'},
  sheetTitle: {color: '#FFFFFF', fontSize: 22, fontWeight: '700'},
  sheetSubtitle: {color: '#858A95', fontSize: 12, marginTop: 4},
  sheetClose: {color: '#AEB2BA', fontSize: 28, lineHeight: 30},
  sheetScroll: {paddingBottom: 12},
  filterSection: {paddingTop: 20},
  filterSectionTitle: {color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginBottom: 11},
  filterChoices: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  sheetActions: {flexDirection: 'row', gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#24272E'},
  resetButton: {height: 48, paddingHorizontal: 24, borderRadius: 14, borderWidth: 1, borderColor: '#343741', alignItems: 'center', justifyContent: 'center'},
  resetButtonText: {color: '#D4D6DB', fontSize: 14, fontWeight: '700'},
  applyButton: {height: 48, flex: 1, borderRadius: 14, backgroundColor: '#FF3438', alignItems: 'center', justifyContent: 'center'},
  applyButtonText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
});
