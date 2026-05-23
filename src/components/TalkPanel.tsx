import { useRef, useEffect } from "react";
import type { LanguageCode } from "../types/translation";
import { LANGUAGE_LABELS } from "../types/translation";

const LANG_CODE: Record<LanguageCode, string> = { ja: "JA", en: "EN", zh: "ZH", ko: "KO" };

export type PaneEntry = {
  label: string;
  text: string;
  isLive?: boolean;
};

type Props = {
  who: string;
  lang: LanguageCode;
  entries: PaneEntry[];
};

export function TranslationPane({ who, lang, entries }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // scroll to top (newest entry) when entries change or live text grows
  const lastText = entries.at(-1)?.text ?? "";
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = 0;
  }, [entries.length, lastText]);

  return (
    <section className="pane">
      <div className="pane-hd">
        <div className="who">
          <span>{who}</span>
          <span className="who-lang">
            <span className="who-lang-code">{LANG_CODE[lang]}</span>
            {LANGUAGE_LABELS[lang]}
          </span>
        </div>
      </div>

      <div className="pane-body" ref={bodyRef}>
        {entries.length === 0 ? (
          <p className="pane-empty">マイクボタンを押して話し始めてください…</p>
        ) : (
          <div className="pane-log">
            {[...entries].reverse().map((entry, i) => (
              <div key={i} className={`pane-entry pane-entry--${entry.label === "翻訳" ? "tx" : "src"}`}>
                <span className="pane-entry-label">{entry.label}</span>
                <span className="pane-entry-text">
                  {entry.text}
                  {entry.isLive && <span className="caret" />}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </section>
  );
}
