"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_LANG, STRINGS, type Lang } from "./strings";

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (typeof STRINGS)["bn"];
};

const Ctx = createContext<LangCtx>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: STRINGS[DEFAULT_LANG],
});

const STORAGE_KEY = "cashready.lang";

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "bn") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  };

  return (
    <Ctx.Provider value={{ lang, setLang, t: STRINGS[lang] }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  return useContext(Ctx);
}

/** Header toggle: বাং | EN */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className="inline-flex items-center rounded-full bg-white dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.08] p-0.5 shadow-sm"
      role="group"
      aria-label="Language selection"
    >
      {(["bn", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-3 py-1.5 sm:py-1 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 min-h-[36px] flex items-center justify-center ${
            lang === l
              ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          {l === "bn" ? "বাং" : "EN"}
        </button>
      ))}
    </div>
  );
}
