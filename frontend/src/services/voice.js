// Voice helper for speech synthesis with strict language configuration and fallback reporting
const LANGUAGE_ALIASES = {
  English: 'English',
  Hindi: 'Hindi',
  Assamese: 'Assamese',
  Bengali: 'Bengali',
  Khasi: 'Khasi',
  'Manipuri / Meitei': 'Manipuri / Meitei',
  Mizo: 'Mizo',
  Kokborok: 'Kokborok',
  Bodo: 'Bodo',
  en: 'English',
  hi: 'Hindi',
  as: 'Assamese',
  bn: 'Bengali',
  kh: 'Khasi',
  mni: 'Manipuri / Meitei',
  lus: 'Mizo',
  trp: 'Kokborok',
  brx: 'Bodo',
  'en-in': 'English',
  'hi-in': 'Hindi',
  'as-in': 'Assamese',
  'bn-in': 'Bengali',
  'mni-in': 'Manipuri / Meitei',
  'trp-in': 'Kokborok',
  'brx-in': 'Bodo',
  'en-us': 'English',
  'en-gb': 'English',
  'bn-bd': 'Bengali',
  'hi': 'Hindi'
};

function normalizeSpeechLanguage(langPreference = 'English') {
  const raw = String(langPreference ?? 'English').trim();
  if (!raw) return 'English';

  const lower = raw.toLowerCase().replace(/_/g, '-');
  if (LANGUAGE_ALIASES[raw]) return LANGUAGE_ALIASES[raw];
  if (LANGUAGE_ALIASES[lower]) return LANGUAGE_ALIASES[lower];

  const prefix = lower.split('-')[0];
  if (prefix === 'en') return 'English';
  if (prefix === 'hi') return 'Hindi';
  if (prefix === 'as') return 'Assamese';
  if (prefix === 'bn') return 'Bengali';
  if (prefix === 'kh') return 'Khasi';
  if (prefix === 'mni') return 'Manipuri / Meitei';
  if (prefix === 'lus') return 'Mizo';
  if (prefix === 'trp') return 'Kokborok';
  if (prefix === 'brx') return 'Bodo';

  return 'English';
}

export function isSpeechSynthesisAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSpeechRecognitionAvailable() {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

// BCP-47 mapping for all 9 supported languages
// For languages without TTS voice support (Khasi, Mizo, Kokborok, Bodo, Manipuri),
// nativeLangPrefixes lists prefixes that a voice must match to be considered compatible.
export const LANGUAGE_CONFIG = {
  English:             { speechLanguage: 'en-IN',  code: 'en',  nativePrefixes: ['en'],         fallbackLangs: ['en-US', 'en-GB'] },
  Hindi:               { speechLanguage: 'hi-IN',  code: 'hi',  nativePrefixes: ['hi'],         fallbackLangs: ['hi'] },
  Assamese:            { speechLanguage: 'as-IN',  code: 'as',  nativePrefixes: ['as', 'bn'],   fallbackLangs: ['bn-IN', 'hi-IN'] },
  Bengali:             { speechLanguage: 'bn-IN',  code: 'bn',  nativePrefixes: ['bn'],         fallbackLangs: ['bn-BD'] },
  Khasi:               { speechLanguage: 'en-IN',  code: 'kh',  nativePrefixes: ['en'],         fallbackLangs: ['en-US'] },
  'Manipuri / Meitei': { speechLanguage: 'mni-IN', code: 'mni', nativePrefixes: ['mni', 'hi'],  fallbackLangs: ['hi-IN'] },
  Mizo:                { speechLanguage: 'en-IN',  code: 'lus', nativePrefixes: ['en'],         fallbackLangs: ['en-US'] },
  Kokborok:            { speechLanguage: 'trp-IN', code: 'trp', nativePrefixes: ['trp', 'hi'],  fallbackLangs: ['hi-IN'] },
  Bodo:                { speechLanguage: 'brx-IN', code: 'brx', nativePrefixes: ['brx', 'hi'],  fallbackLangs: ['hi-IN'] },

  // Key codes shorthand (mirrors above)
  en:  { speechLanguage: 'en-IN',  code: 'en',  nativePrefixes: ['en'],        fallbackLangs: ['en-US', 'en-GB'] },
  hi:  { speechLanguage: 'hi-IN',  code: 'hi',  nativePrefixes: ['hi'],        fallbackLangs: ['hi'] },
  as:  { speechLanguage: 'as-IN',  code: 'as',  nativePrefixes: ['as', 'bn'],  fallbackLangs: ['bn-IN', 'hi-IN'] },
  bn:  { speechLanguage: 'bn-IN',  code: 'bn',  nativePrefixes: ['bn'],        fallbackLangs: ['bn-BD'] },
  kh:  { speechLanguage: 'en-IN',  code: 'kh',  nativePrefixes: ['en'],        fallbackLangs: ['en-US'] },
  mni: { speechLanguage: 'mni-IN', code: 'mni', nativePrefixes: ['mni', 'hi'], fallbackLangs: ['hi-IN'] },
  lus: { speechLanguage: 'en-IN',  code: 'lus', nativePrefixes: ['en'],        fallbackLangs: ['en-US'] },
  trp: { speechLanguage: 'trp-IN', code: 'trp', nativePrefixes: ['trp', 'hi'], fallbackLangs: ['hi-IN'] },
  brx: { speechLanguage: 'brx-IN', code: 'brx', nativePrefixes: ['brx', 'hi'], fallbackLangs: ['hi-IN'] }
};

/**
 * Returns a Promise that resolves to the browser's voice list.
 * Handles the async loading quirk: voices may not be available on first call
 * and require listening to the 'voiceschanged' event.
 */
function getVoicesAsync() {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisAvailable()) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      resolve(voices);
      return;
    }

    // Voices not yet loaded — wait for the event (with timeout fallback)
    let resolved = false;
    const handler = () => {
      if (resolved) return;
      resolved = true;
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices() || []);
    };

    window.speechSynthesis.addEventListener('voiceschanged', handler);

    // Safety timeout: if voiceschanged never fires, proceed after 1.5s
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(window.speechSynthesis.getVoices() || []);
      }
    }, 1500);
  });
}

/**
 * Finds the best voice for a language FROM the nativePrefixes list ONLY.
 * Returns null if no compatible voice is found (don't force an incompatible voice).
 */
function findCompatibleVoice(targetLanguage, voices = []) {
  const config = LANGUAGE_CONFIG[targetLanguage] || LANGUAGE_CONFIG['English'];
  const nativePrefixes = config.nativePrefixes || [];

  // 1. Try exact match on speechLanguage
  const exactMatch = voices.find(
    (v) => v.lang.toLowerCase() === config.speechLanguage.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // 2. Try matching any native prefix
  for (const prefix of nativePrefixes) {
    const prefixMatch = voices.find((v) =>
      v.lang.toLowerCase().startsWith(prefix.toLowerCase())
    );
    if (prefixMatch) return prefixMatch;
  }

  // 3. Try fallback langs
  for (const fallback of config.fallbackLangs || []) {
    const fPrefix = fallback.toLowerCase().split('-')[0];
    // Only use fallback if it shares a native prefix
    if (nativePrefixes.some((np) => np.toLowerCase() === fPrefix)) {
      const fallbackVoice = voices.find((v) =>
        v.lang.toLowerCase() === fallback.toLowerCase() ||
        v.lang.toLowerCase().startsWith(fPrefix)
      );
      if (fallbackVoice) return fallbackVoice;
    }
  }

  // No compatible voice found — returning null is intentional.
  // We will NOT assign an incompatible voice (e.g. en-US for Bengali).
  return null;
}

/**
 * Checks voice availability for a target patient language.
 * status: 'native' = perfect match, 'compatible' = workable fallback,
 *         'lang-only' = no matching voice but browser will try with lang attr,
 *         'none' = synthesis unsupported
 */
function buildVoiceStatus(normalizedLang, voices) {
  const config = LANGUAGE_CONFIG[normalizedLang] || LANGUAGE_CONFIG['English'];
  const targetLang = config.speechLanguage.toLowerCase();
  const targetPrefix = targetLang.split('-')[0];

  // Native exact match
  const nativeVoice = voices.find(
    (v) => v.lang.toLowerCase() === targetLang || v.lang.toLowerCase().startsWith(targetPrefix)
  );
  if (nativeVoice) {
    return { status: 'native', label: `${normalizedLang} voice available (${nativeVoice.lang})`, voice: nativeVoice };
  }

  // Compatible voice (same script/prefix)
  const compatVoice = findCompatibleVoice(normalizedLang, voices);
  if (compatVoice) {
    return {
      status: 'compatible',
      label: `${normalizedLang} voice not installed — using compatible voice (${compatVoice.lang})`,
      voice: compatVoice
    };
  }

  // No matching voice — browser will try using lang attribute alone
  return {
    status: 'lang-only',
    label: `No ${normalizedLang} voice installed. Enable it in device/browser TTS settings.`,
    voice: null
  };
}

export function getVoiceStatus(langPreference = 'English') {
  if (!isSpeechSynthesisAvailable()) {
    return { status: 'none', label: 'Voice synthesis unsupported', voice: null };
  }
  const normalizedLang = normalizeSpeechLanguage(langPreference);
  const voices = window.speechSynthesis.getVoices() || [];
  return buildVoiceStatus(normalizedLang, voices);
}

export async function getVoiceStatusAsync(langPreference = 'English') {
  if (!isSpeechSynthesisAvailable()) {
    return { status: 'none', label: 'Voice synthesis unsupported', voice: null };
  }
  const normalizedLang = normalizeSpeechLanguage(langPreference);
  const voices = await getVoicesAsync();
  return buildVoiceStatus(normalizedLang, voices);
}

/**
 * Reusable speak function for Saathi voice synthesis.
 * MUST receive already translated patient-facing text.
 *
 * KEY FIX: We only assign utterance.voice when the found voice actually
 * speaks the target language. An incompatible voice (e.g. en-US for Bengali)
 * causes silence. When no native voice exists, we set utterance.lang only
 * and let the browser handle it — on some platforms (Android Chrome, iOS)
 * this triggers an online/system voice.
 *
 * Returns { success: boolean, statusText: string }
 */
export function speakSaathi(translatedText, patientLanguage = 'English', onEndCallback = null) {
  if (!isSpeechSynthesisAvailable() || !translatedText) {
    console.warn('[Saathi Voice] Speech synthesis unavailable or empty text.');
    if (onEndCallback) onEndCallback();
    return { success: false, statusText: 'Voice unavailable' };
  }

  const normalizedLanguage = normalizeSpeechLanguage(patientLanguage);
  const config = LANGUAGE_CONFIG[normalizedLanguage] || LANGUAGE_CONFIG['English'];

  window.speechSynthesis.cancel();

  getVoicesAsync().then((voices) => {
    const compatibleVoice = findCompatibleVoice(normalizedLanguage, voices);

    const utterance = new SpeechSynthesisUtterance(translatedText);
    // Always set the BCP-47 language — this is what tells the browser WHICH language to speak
    utterance.lang = config.speechLanguage;
    utterance.rate = 0.88;
    utterance.pitch = 1.0;

    if (compatibleVoice) {
      // Only set voice when it actually supports the target language script/prefix
      utterance.voice = compatibleVoice;
      console.log(
        `[Saathi Voice] ✅ Speaking "${normalizedLanguage}" using voice: ${compatibleVoice.name} (${compatibleVoice.lang})`
      );
    } else {
      // No matching voice — do NOT set utterance.voice.
      // The browser will attempt using utterance.lang alone.
      // On many platforms (Android, iOS, some Chrome builds) this works via online TTS.
      console.warn(
        `[Saathi Voice] ⚠️ No installed voice for "${normalizedLanguage}". ` +
        `Attempting with lang="${config.speechLanguage}" only (browser may use online TTS).`
      );
    }

    utterance.onend = () => {
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = (e) => {
      console.warn('[Saathi Voice Error]', e.error, e);
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  });

  return { success: true, statusText: `Speaking in ${normalizedLanguage}` };
}

// Backwards compatibility wrappers
export function speakText(text, langPreference = 'English', onEndCallback = null) {
  const result = speakSaathi(text, langPreference, onEndCallback);
  return result.success;
}

export function stopSpeaking() {
  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.cancel();
  }
}
