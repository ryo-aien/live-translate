import { Icon } from "./Icon";
import type { LanguageCode } from "../types/translation";
import { LANGUAGE_LABELS } from "../types/translation";

const LANG_CODE: Record<LanguageCode, string> = { ja: "JA", en: "EN", zh: "ZH", ko: "KO" };

type Props = {
  who: string;
  lang: LanguageCode;
  isSource: boolean;
  transcript?: string;
  translation?: string;
  showCaret?: boolean;
};

export function TranslationPane({
  who,
  lang,
  isSource,
  transcript = "",
  translation = "",
  showCaret = false,
}: Props) {
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

      <div className="pane-body">
        {isSource ? (
          <div className={`transcript${!transcript ? " empty" : ""}`}>
            {transcript || "マイクボタンを押して話し始めてください…"}
            {showCaret && transcript && <span className="caret" />}
          </div>
        ) : (
          <>
            <div className="tx-label">
              <span className="tx-live-dot" />
              翻訳 · {LANGUAGE_LABELS[lang]}
            </div>
            <div className={`translation${!translation ? " empty" : ""}`}>
              {translation || "ここに翻訳が表示されます"}
              {showCaret && translation && <span className="caret" />}
            </div>
          </>
        )}
      </div>

      <div className="pane-ft">
        <div className="pane-ft-meta">
          <span><b>信頼度</b> —</span>
        </div>
      </div>
    </section>
  );
}
