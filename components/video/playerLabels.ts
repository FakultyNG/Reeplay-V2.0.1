type PlayerLabelContent = {
  title: string;
  vidClass: string;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  releaseYear?: string | number;
  runtime?: string;
  isReeplayOriginal?: boolean;
};

export function getPlayerLabels(
  content: PlayerLabelContent,
  type?: string,
  isLiveNow = false,
): {title: string; secondary: string} {
  if (isLiveNow) {
    return {title: content.title || 'Reeplay', secondary: 'LIVE'};
  }

  const isSeries = type?.toLowerCase().includes('series') ?? false;
  if (isSeries) {
    const title = content.seriesTitle || content.title || 'Reeplay';
    const episodeContext = [
      content.seasonNumber != null ? `S${content.seasonNumber}` : '',
      content.episodeNumber != null ? `Ep ${content.episodeNumber}` : '',
    ]
      .filter(Boolean)
      .join(', ');
    const episodeTitle =
      content.episodeTitle || (content.title !== title ? content.title : '');

    return {
      title,
      secondary: [episodeContext, episodeTitle].filter(Boolean).join(' · ') || 'Series',
    };
  }

  const releaseYear = content.releaseYear
    ? String(content.releaseYear).slice(0, 4)
    : '';
  const accessLabel = content.isReeplayOriginal
    ? 'Reeplay Original'
    : content.vidClass?.toLowerCase() === 'premium'
      ? 'Premium'
      : content.vidClass?.toLowerCase() === 'free'
        ? 'Free'
        : '';

  return {
    title: content.title || 'Reeplay',
    secondary:
      [releaseYear, content.runtime, accessLabel].filter(Boolean).join(' · ') || 'Movie',
  };
}
