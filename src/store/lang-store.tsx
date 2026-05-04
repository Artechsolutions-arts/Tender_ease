import { createContext, useContext, useEffect, useState } from "react";
import type { Lang } from "@/lib/translations";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("ap_lang") as Lang) ?? "en");

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("ap_lang", l);
    const map: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };
    document.documentElement.lang = map[l];
  };

  useEffect(() => {
    const map: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };
    document.documentElement.lang = map[lang];
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
