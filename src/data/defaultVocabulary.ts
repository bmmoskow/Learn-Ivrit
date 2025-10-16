export interface DefaultWord {
  hebrew: string;
  english: string;
}

export const defaultVocabulary: DefaultWord[] = [
  // Pronouns
  { hebrew: 'אני', english: 'I' },
  { hebrew: 'אתה', english: 'you' },
  { hebrew: 'את', english: 'you' },
  { hebrew: 'הוא', english: 'he' },
  { hebrew: 'היא', english: 'she' },
  { hebrew: 'אנחנו', english: 'we' },
  { hebrew: 'אתם', english: 'you' },
  { hebrew: 'אתן', english: 'you' },
  { hebrew: 'הם', english: 'they' },
  { hebrew: 'הן', english: 'they' },

  // Numbers 1-10
  { hebrew: 'אחת', english: 'one' },
  { hebrew: 'שתיים', english: 'two' },
  { hebrew: 'שלוש', english: 'three' },
  { hebrew: 'אַרְבַּע', english: 'four' },
  { hebrew: 'חָמֵשׁ', english: 'five' },
  { hebrew: 'שֵׁשׁ', english: 'six' },
  { hebrew: 'שֶׁבַע', english: 'seven' },
  { hebrew: 'שְׁמוֹנֶה', english: 'eight' },
  { hebrew: 'תֵּשַׁע', english: 'nine' },
  { hebrew: 'עֶשֶׂר', english: 'ten' },

  // Question words
  { hebrew: 'מי', english: 'who' },
  { hebrew: 'מה', english: 'what' },
  { hebrew: 'איפה', english: 'where' },
  { hebrew: 'למה', english: 'why' },
  { hebrew: 'איך', english: 'how' },
  { hebrew: 'מתי', english: 'when' },
  { hebrew: 'כמה', english: 'how much' },
];
