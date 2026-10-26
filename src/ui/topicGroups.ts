import { isAutoMarked, type QuestionType } from '../core/question';

export type TopicGroupId = 'reading' | 'words' | 'grammar' | 'writing' | 'together';

export const TOPIC_GROUPS: { id: TopicGroupId; title: string }[] = [
  { id: 'reading', title: 'Reading and understanding' },
  { id: 'words', title: 'Words and spelling' },
  { id: 'grammar', title: 'Grammar' },
  { id: 'writing', title: 'Writing' },
  { id: 'together', title: 'Do together' },
];

const GRAMMAR = /\b(nouns?|verbs?|adjectives?|adverbs?|tenses?|pronouns?|articles?|prepositions?|conjunctions?|punctuation|capital letters?|plurals?|singular|grammar|is\/are|was\/were|has\/have|a\/an|joining words)\b/i;
const WORDS = /unjumble|jumble|spell|\bwords?\b|opposites?|synonyms?|rhym|homophone|similes?|meanings?|hidden|crossword|name the thing|fill the blanks with the right word/i;

/**
 * Which kind of work a topic is. Lessons carry no kind tag yet, so it is worked out from the topic's title:
 * "do together" topics are those a grown-up checks; then grammar, writing, words and spelling; everything else is reading and understanding.
 */
export function topicGroup(t: Pick<QuestionType, 'title' | 'autoMarked'>, tags: string[] = []): TopicGroupId {
  if (!isAutoMarked(t as QuestionType)) return 'together';
  if (tags.some((g) => g.startsWith('grammar:')) && !/^write\b/i.test(t.title)) return 'grammar';
  if (GRAMMAR.test(t.title)) return 'grammar';
  if (/^write\b|^be\b|^say how|^make a|^fill an application|written\b|slogan|\bletter\b|instructions|conversation|speech|what would i do|^fights with/i.test(t.title) && !/answer|facts|true or false/i.test(t.title)) return 'writing';
  if (WORDS.test(t.title) && !/understand|true or false|answer in|facts/i.test(t.title)) return 'words';
  return 'reading';
}

export interface TopicGroupSet<T> {
  id: TopicGroupId;
  title: string;
  topics: T[];
}

/** Topics in groups, in the page order. Empty groups are left out and every topic is in exactly one group. */
export function groupTopics<T extends Pick<QuestionType, 'title' | 'autoMarked'>>(topics: T[], groupOf: (t: T) => TopicGroupId = (t) => topicGroup(t)): TopicGroupSet<T>[] {
  return TOPIC_GROUPS.map((g) => ({ ...g, topics: topics.filter((t) => groupOf(t) === g.id) })).filter((g) => g.topics.length > 0);
}

