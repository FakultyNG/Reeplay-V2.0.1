type SearchableContent = {
  title?: string;
  subtitle?: string;
  subTitle?: string;
  artistName?: string;
  description?: string;
  type?: string;
};

const normalizeSearchText = (value: string | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const relevanceFor = (content: SearchableContent, query: string) => {
  const normalizedQuery = normalizeSearchText(query);
  const title = normalizeSearchText(content.title);

  if (title === normalizedQuery) return 0;
  if (title.startsWith(normalizedQuery)) return 1;

  const titleWords = title.split(' ').filter(Boolean);
  if (titleWords.some(word => word.startsWith(normalizedQuery))) return 2;
  if (title.includes(normalizedQuery)) return 3;

  const queryWords = normalizedQuery.split(' ').filter(Boolean);
  if (
    queryWords.length > 1 &&
    queryWords.every(queryWord =>
      titleWords.some(titleWord => titleWord.startsWith(queryWord)),
    )
  ) {
    return 4;
  }

  const supportingText = normalizeSearchText(
    [
      content.subtitle,
      content.subTitle,
      content.artistName,
      content.description,
      content.type,
    ]
      .filter(Boolean)
      .join(' '),
  );

  return supportingText.includes(normalizedQuery) ? 5 : 6;
};

export const rankSearchResults = <T extends SearchableContent>(
  contents: T[],
  query: string,
) =>
  contents
    .map((content, index) => ({content, index}))
    .sort((left, right) => {
      const relevanceDifference =
        relevanceFor(left.content, query) - relevanceFor(right.content, query);

      return relevanceDifference || left.index - right.index;
    })
    .map(({content}) => content);
