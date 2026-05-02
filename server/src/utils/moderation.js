export const checkContent = (text) => {
  if (!text) return { level: 'clean' };
  const t = text.toLowerCase();

  // ── Phone & email detection (privacy protection) ──────────────────────────
  // Matches Indian mobile numbers (+91 / 0 prefix / bare 10-digit starting 6-9)
  const phoneRegex = /(\+91|0)?[6-9]\d{9}/;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (phoneRegex.test(t) || emailRegex.test(t)) {
    return { level: 'bad', reason: 'Personal contact info not allowed (Privacy Protection).' };
  }

  // ── Severe blocklist (25+ terms) ──────────────────────────────────────────
  // English slurs, sexual terms, violent threats + Hindi abuse (transliterated)
  const badWords = [
    // Hindi severe abuse
    'madarchod', 'behenchod', 'bhenchod', 'maderchod',
    'chutiya', 'chutiye', 'randi', 'harami', 'bhosadike',
    'gandu', 'laude', 'lavde', 'kamine', 'kaminey',
    'balatkar', 'balaatkaar', 'maaro', 'kaato',
    // English slurs & sexual
    'fuck', 'fucker', 'fucking', 'cunt', 'nigger', 'faggot',
    'rape', 'molest', 'nude', 'porn', 'pornography', 'xxx',
    // Violent threat keywords
    'suicide', 'kill yourself', 'kys', 'bomb threat', 'shoot you',
    'i will kill', 'main marunga',
  ];

  // ── Mild blocklist (20+ terms) ────────────────────────────────────────────
  // Common insults, mild toxicity, caste-targeted slurs used as insults
  const mildWords = [
    'idiot', 'stupid', 'dumb', 'loser', 'hate', 'trash',
    'moron', 'retard', 'ugly', 'fat', 'bakwas', 'bekar',
    'bewakoof', 'gadha', 'ullu', 'pagal', 'nikamma',
    // Caste-targeted terms used as slurs (flagged for review, not auto-blocked)
    'chamar', 'bhangi', 'neech',
    // Mild English
    'bitch', 'asshole', 'bastard',
  ];

  if (badWords.some((w) => t.includes(w))) {
    return { level: 'bad', reason: 'Content violates community guidelines (severe toxicity).' };
  }

  if (mildWords.some((w) => t.includes(w))) {
    return { level: 'mild', reason: 'Content may be considered toxic or targeted.' };
  }

  return { level: 'clean' };
};
