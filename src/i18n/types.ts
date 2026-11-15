export type Locale = 'id-ID' | 'en-US' | 'en-GB' | 'zh-CN' | 'ru-RU'

export interface LocaleOption {
  code: Locale
  name: string
  shortName: string
  englishName: string
  direction: 'ltr'
  dateFormat: string
  flag?: string
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  {
    code: 'id-ID',
    name: 'Bahasa Indonesia',
    shortName: 'ID',
    englishName: 'Indonesian',
    direction: 'ltr',
    dateFormat: 'DD MMMM YYYY',
  },
  {
    code: 'en-US',
    name: 'English (US)',
    shortName: 'EN-US',
    englishName: 'English (US)',
    direction: 'ltr',
    dateFormat: 'MMMM D, YYYY',
  },
  {
    code: 'en-GB',
    name: 'English (UK)',
    shortName: 'EN-GB',
    englishName: 'English (UK)',
    direction: 'ltr',
    dateFormat: 'D MMMM YYYY',
  },
  {
    code: 'zh-CN',
    name: '中文（简体）',
    shortName: '中文',
    englishName: 'Chinese (Simplified)',
    direction: 'ltr',
    dateFormat: 'YYYY年M月D日',
  },
  {
    code: 'ru-RU',
    name: 'Русский',
    shortName: 'РУС',
    englishName: 'Russian',
    direction: 'ltr',
    dateFormat: 'D MMMM YYYY г.',
  },
]

export const DEFAULT_LOCALE: Locale = 'id-ID'

export interface TranslationParams {
  [key: string]: string | number | undefined
}
