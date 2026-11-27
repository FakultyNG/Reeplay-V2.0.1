import type {IVODContent} from '@/types/api/content.types';

export const isMusicVideoContent = (content: Pick<IVODContent, 'type'>) =>
  content.type?.trim().toLowerCase().replace(/[\s_]+/g, '-') === 'music-video';

export const filterGeneralVodContent = <T extends Pick<IVODContent, 'type'>>(
  content: T[],
) => content.filter(item => !isMusicVideoContent(item));

export const filterMusicVideoContent = <T extends Pick<IVODContent, 'type'>>(
  content: T[],
) => content.filter(isMusicVideoContent);

export const filterCategoryVodContent = <T extends Pick<IVODContent, 'type'>>(
  content: T[],
  musicVideoCategory: boolean,
) =>
  musicVideoCategory
    ? filterMusicVideoContent(content)
    : filterGeneralVodContent(content);
