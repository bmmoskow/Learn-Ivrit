const definiteArticle = 'ה';
const commonPrefixes = ['ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש'];

const vowelMarks = '\u05B0-\u05BD\u05BF-\u05C2\u05C4\u05C5\u05C7';

function removeFirstCharWithVowels(word: string): string {
  let result = '';
  let skipFirst = true;

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const isVowel = new RegExp(`[${vowelMarks}]`).test(char);

    if (skipFirst && !isVowel) {
      skipFirst = false;
      continue;
    }

    if (!skipFirst) {
      result += char;
    }
  }

  return result;
}

function removeLastNCharsKeepVowels(word: string, n: number): string {
  const chars = Array.from(word);
  let consonantCount = 0;
  let result = '';

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const isVowel = new RegExp(`[${vowelMarks}]`).test(char);

    if (!isVowel) {
      consonantCount++;
    }

    const consonantsFromEnd = chars.slice(i + 1).filter(c => !new RegExp(`[${vowelMarks}]`).test(c)).length;

    if (consonantsFromEnd >= n) {
      result += char;
    } else if (isVowel && consonantsFromEnd > n) {
      result += char;
    }
  }

  return result;
}

export function generateBasicHebrewForms(word: string, transliteration: string): Array<{ hebrew: string; transliteration: string; relationship: string }> {
  const forms: Array<{ hebrew: string; transliteration: string; relationship: string }> = [];

  if (word.startsWith(definiteArticle) && word.length > 2) {
    const withoutArticle = removeFirstCharWithVowels(word);
    if (withoutArticle && withoutArticle !== word) {
      forms.push({
        hebrew: withoutArticle,
        transliteration: transliteration.replace(/^(ha|he)/i, ''),
        relationship: 'without definite article'
      });
    }
  }

  for (const prefix of commonPrefixes) {
    if (word.startsWith(prefix) && word.length > 2 && !word.startsWith(definiteArticle)) {
      const withoutPrefix = removeFirstCharWithVowels(word);
      if (withoutPrefix && withoutPrefix !== word) {
        forms.push({
          hebrew: withoutPrefix,
          transliteration: transliteration,
          relationship: `root form (without ${prefix})`
        });
        break;
      }
    }
  }

  const plainWord = word.replace(new RegExp(`[${vowelMarks}]`, 'g'), '');

  if (plainWord.endsWith('ים')) {
    const singular = removeLastNCharsKeepVowels(word, 2);
    if (singular && singular !== word) {
      forms.push({
        hebrew: singular,
        transliteration: transliteration.replace(/(im|eem)$/i, ''),
        relationship: 'singular (masculine plural)'
      });
    }
  } else if (plainWord.endsWith('ות')) {
    const singular = removeLastNCharsKeepVowels(word, 2);
    if (singular && singular !== word) {
      forms.push({
        hebrew: singular,
        transliteration: transliteration.replace(/(ot|oot)$/i, 'a'),
        relationship: 'singular (feminine plural)'
      });
    }
  }

  if (plainWord.endsWith('ה') && !plainWord.endsWith('ים') && !plainWord.endsWith('ות')) {
    const masculine = removeLastNCharsKeepVowels(word, 1);
    if (masculine && masculine !== word) {
      forms.push({
        hebrew: masculine,
        transliteration: transliteration.replace(/a$/i, ''),
        relationship: 'masculine form'
      });
    }
  }

  if (!word.startsWith(definiteArticle)) {
    forms.push({
      hebrew: 'הַ' + word,
      transliteration: 'ha' + transliteration,
      relationship: 'with definite article'
    });
  }

  return forms.slice(0, 3);
}
