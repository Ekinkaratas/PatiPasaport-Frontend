import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import trCommon from './locales/tr/common.json';
import trErrors from './locales/tr/errors.json';
import trEnums from './locales/tr/enums.json';
import trAuth from './locales/tr/auth.json';
import trLanding from './locales/tr/landing.json';
import trPanel from './locales/tr/panel.json';
import trPets from './locales/tr/pets.json';
import trProfile from './locales/tr/profile.json';
import trConsents from './locales/tr/consents.json';
import trClinic from './locales/tr/clinic.json';
import trHealth from './locales/tr/health.json';
import enCommon from './locales/en/common.json';
import enErrors from './locales/en/errors.json';
import enEnums from './locales/en/enums.json';
import enAuth from './locales/en/auth.json';
import enLanding from './locales/en/landing.json';
import enPanel from './locales/en/panel.json';
import enPets from './locales/en/pets.json';
import enProfile from './locales/en/profile.json';
import enConsents from './locales/en/consents.json';
import enClinic from './locales/en/clinic.json';
import enHealth from './locales/en/health.json';
import {
  browserLanguages,
  detectInitialLanguage,
  readStoredLanguage,
  storeLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from './language';

export const resources = {
  tr: {
    common: trCommon,
    errors: trErrors,
    enums: trEnums,
    auth: trAuth,
    landing: trLanding,
    panel: trPanel,
    pets: trPets,
    profile: trProfile,
    consents: trConsents,
    clinic: trClinic,
    health: trHealth,
  },
  en: {
    common: enCommon,
    errors: enErrors,
    enums: enEnums,
    auth: enAuth,
    landing: enLanding,
    panel: enPanel,
    pets: enPets,
    profile: enProfile,
    consents: enConsents,
    clinic: enClinic,
    health: enHealth,
  },
} as const;

export const NAMESPACES = Object.keys(resources.tr) as Array<
  keyof (typeof resources)['tr']
>;

export const defaultNS = 'common';

void i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(readStoredLanguage(), browserLanguages()),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  ns: NAMESPACES,
  defaultNS,
  interpolation: { escapeValue: false }, // React zaten kaçışlıyor
  returnNull: false,
});

function syncDocumentLanguage(language: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

syncDocumentLanguage(i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

/** Kullanıcının dil seçimi: uygulanır ve hatırlanır. */
export function changeLanguage(language: Language): Promise<unknown> {
  storeLanguage(language);
  return i18n.changeLanguage(language);
}

export default i18n;
