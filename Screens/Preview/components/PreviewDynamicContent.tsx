import {Dispatch, SetStateAction} from 'react';
import RelatedContent from './RelatedContent';
import FilmContent from './FilmContent';
import SeriesContent from './SeriesContent';
import {previewContentType} from '@/navigation/AppNavigator';
import {IDownloadData, IVODContent} from '@/types/api/content.types';

type Props = {
  content: string;
  previewContent: IVODContent;
  accessStatus: boolean;
  makeFullscreen: () => void;
  setFullscreenContent: Dispatch<SetStateAction<IDownloadData | null>>;
};

const PreviewDynamicContent = ({
  content,
  previewContent,
  accessStatus,
  makeFullscreen,
  setFullscreenContent,
}: Props) => {
  const genreId =
    previewContent.genre[
      Math.floor(Math.random() * previewContent.genre.length)
    ]._id;

  if (content === previewContentType['music video']) {
    return (
      <RelatedContent
        title="Related Videos"
        vodId={previewContent._id}
        genreId={genreId}
      />
    );
  }

  if (content === previewContentType['tv series']) {
    return (
      <SeriesContent
        vod={previewContent}
        accessStatus={accessStatus}
        setFullscreenContent={setFullscreenContent}
        makeFullscreen={makeFullscreen}
      />
    );
  }

  return (
    <FilmContent
      vodId={previewContent._id}
      casts={previewContent.cast}
      genreId={genreId}
    />
  );
};

export default PreviewDynamicContent;
