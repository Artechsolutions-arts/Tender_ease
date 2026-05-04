import { useLang } from "@/store/lang-store";
import { t, type TranslationKey } from "@/lib/translations";

export function useT() {
  const { lang } = useLang();
  return (key: TranslationKey) => t(lang, key);
}
