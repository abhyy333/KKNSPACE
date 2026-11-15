export type Locale = 'id-ID'

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
]

export const DEFAULT_LOCALE: Locale = 'id-ID'

export interface TranslationParams {
  [key: string]: string | number | undefined
}
