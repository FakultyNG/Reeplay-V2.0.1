import {Dispatch, Fragment, SetStateAction} from 'react';
import RelatedContent from './RelatedContent';
import FilmContent from './FilmContent';
import SeriesContent from './SeriesContent';
import {previewContentType} from '@/navigation/AppNavigator';
import {IDownloadData, IVODContent} from '@/types/api/content.types';

type Props = {
  content: previewContentType;
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
  const relatedTitle =
    previewContent.type === 'music-video'
      ? 'Related Music Videos'
      : previewContent.type === 'series'
        ? 'Related Series'
        : previewContent.type === 'skit'
          ? 'Related Skits'
          : 'Related Movies';

  if (content === previewContentType['music video']) {
    return (
      <RelatedContent
        title={relatedTitle}
        vodId={previewContent._id}
      />
    );
  }

  if (content === previewContentType['tv series']) {
    return (
      <Fragment>
        <SeriesContent
          vod={previewContent}
          accessStatus={accessStatus}
          setFullscreenContent={setFullscreenContent}
          makeFullscreen={makeFullscreen}
        />
        <RelatedContent title={relatedTitle} vodId={previewContent._id} />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <FilmContent vodId={previewContent._id} />
      <RelatedContent title={relatedTitle} vodId={previewContent._id} />
    </Fragment>
  );
};

export default PreviewDynamicContent;
