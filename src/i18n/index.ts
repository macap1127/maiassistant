import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import sv from "./locales/sv.json";
import hi from "./locales/hi.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import ru from "./locales/ru.json";

export const UI_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish (Español)" },
  { value: "fr", label: "French (Français)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "it", label: "Italian (Italiano)" },
  { value: "pt", label: "Portuguese (Português)" },
  { value: "nl", label: "Dutch (Nederlands)" },
  { value: "pl", label: "Polish (Polski)" },
  { value: "sv", label: "Swedish (Svenska)" },
  { value: "hi", label: "Hindi (हिन्दी)" },
  { value: "ar", label: "Arabic (العربية)" },
  { value: "zh", label: "Mandarin (中文)" },
  { value: "ja", label: "Japanese (日本語)" },
  { value: "ko", label: "Korean (한국어)" },
  { value: "ru", label: "Russian (Русский)" },
] as const;

export const UI_LANGUAGE_STORAGE_KEY = "mia_ui_language";

const RTL = new Set(["ar"]);

export const applyDocumentLanguage = (lng: string) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng;
  document.documentElement.dir = RTL.has(lng) ? "rtl" : "ltr";
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
      pt: { translation: pt },
      nl: { translation: nl },
      pl: { translation: pl },
      sv: { translation: sv },
      hi: { translation: hi },
      ar: { translation: ar },
      zh: { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
      ru: { translation: ru },
    },
    fallbackLng: "en",
    supportedLngs: UI_LANGUAGES.map((l) => l.value),
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      // Saved choice wins; otherwise auto-detect from the device/browser.
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: UI_LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

applyDocumentLanguage(i18n.resolvedLanguage || "en");
i18n.on("languageChanged", (lng) => applyDocumentLanguage(lng));

export const setUiLanguage = (lng: string) => {
  localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, lng);
  return i18n.changeLanguage(lng);
};

export default i18n;
