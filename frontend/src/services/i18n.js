import en from '../locales/en.json'
import hi from '../locales/hi.json'
import as from '../locales/as.json'
import bn from '../locales/bn.json'
import kh from '../locales/kh.json'
import mni from '../locales/mni.json'
import lus from '../locales/lus.json'
import trp from '../locales/trp.json'
import brx from '../locales/brx.json'

const localeAliases = {
  en: 'English',
  hi: 'Hindi',
  as: 'Assamese',
  bn: 'Bengali',
  kh: 'Khasi',
  mni: 'Manipuri / Meitei',
  lus: 'Mizo',
  trp: 'Kokborok',
  brx: 'Bodo',
  English: 'English',
  Hindi: 'Hindi',
  Assamese: 'Assamese',
  Bengali: 'Bengali',
  Khasi: 'Khasi',
  'Manipuri / Meitei': 'Manipuri / Meitei',
  Mizo: 'Mizo',
  Kokborok: 'Kokborok',
  Bodo: 'Bodo'
}

const locales = {
  English: en,
  Hindi: hi,
  Assamese: as,
  Bengali: bn,
  Khasi: kh,
  'Manipuri / Meitei': mni,
  Mizo: lus,
  Kokborok: trp,
  Bodo: brx,
  en: en,
  hi: hi,
  as: as,
  bn: bn,
  kh: kh,
  mni: mni,
  lus: lus,
  trp: trp,
  brx: brx
}

export function normalizeLanguage(lang = 'English') {
  const raw = String(lang ?? 'English').trim()
  if (!raw) return 'English'

  if (localeAliases[raw]) return localeAliases[raw]
  if (locales[raw]) return raw

  return 'English'
}

export const SUPPORTED_LANGUAGES = [
  { code: 'English', label: 'English (en)' },
  { code: 'Hindi', label: 'Hindi (हिन्दी)' },
  { code: 'Assamese', label: 'Assamese (অসমীয়া)' },
  { code: 'Bengali', label: 'Bengali (বাংলা)' },
  { code: 'Khasi', label: 'Khasi' },
  { code: 'Manipuri / Meitei', label: 'Manipuri / Meitei (মৈতৈলোন্)' },
  { code: 'Mizo', label: 'Mizo' },
  { code: 'Kokborok', label: 'Kokborok' },
  { code: 'Bodo', label: 'Bodo (बर\u094D)' }
]

export function t(key, lang = 'English', params = {}) {
  const normalizedLang = normalizeLanguage(lang)
  const dict = locales[normalizedLang] || locales['English'] || en
  let text = (dict && dict[key]) || en[key] || key

  if (typeof text === 'string' && params && typeof params === 'object') {
    Object.keys(params).forEach(p => {
      text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p])
    })
  }
  return text
}

