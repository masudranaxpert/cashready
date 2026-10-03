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
      className="inline-flex items-center rounded-full bg-slate-900 border border-slate-800 p-0.5"
      role="group"
      aria-label="Language"
    >
      {(["bn", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
            lang === l
              ? "bg-teal-500/20 text-teal-300"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {l === "bn" ? "বাং" : "EN"}
        </button>
      ))}
    </div>
  );
}
