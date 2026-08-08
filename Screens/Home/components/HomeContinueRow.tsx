import {FlatList} from 'react-native';
import {AppText, AppView} from '@/components';
import ContentWrapper from '@/components/ContentWrapper';
import ContinueWatchingComp from '@/components/ContinueWatchingComp';
import {useAppSelector} from '@/Hooks/reduxHook';
import {
  selectCategories,
  selectContinueWatching,
} from '@/store/slices/bannerSlice.slice';
import {IDownloadData} from '@/types/api/content.types';
import {Dispatch, SetStateAction} from 'react';

type Props = {
  afterGenres?: boolean;
  makeFullscreen: () => void;
  setFullscreenContent: Dispatch<SetStateAction<IDownloadData | null>>;
};

const HomeContinueRow = ({
  afterGenres = false,
  makeFullscreen,
  setFullscreenContent,
}: Props) => {
  const cat = useAppSelector(selectCategories) ?? [];
  const continueWatching = useAppSelector(selectContinueWatching) ?? [];

  return (
    <AppView className={afterGenres ? 'mt-10 pl-5' : 'mt-8 pl-5'}>
      {continueWatching.length > 0 ? (
        <>
          <AppText className="text-lg text-white font-MANROPE_700">
            Continue watching
          </AppText>
          <FlatList
            data={continueWatching}
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({item, index}) => (
              <ContinueWatchingComp
                item={item}
                key={index}
                makeFullscreen={makeFullscreen}
                setFullscreenContent={setFullscreenContent}
              />
            )}
          />
        </>
      ) : (
        <>{cat.length > 0 && <ContentWrapper enums={cat[0]} showPagination />}</>
      )}
    </AppView>
  );
};

export default HomeContinueRow;
