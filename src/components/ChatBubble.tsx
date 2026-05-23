import type { Direction, LanguageCode } from "../types/translation";
import { LANGUAGE_LABELS } from "../types/translation";

type Props = {
  direction: Direction;
  sourceText: string;
  translatedText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  isStreaming?: boolean;
};

export function LogBubble({
  direction,
  sourceText,
  translatedText,
  sourceLanguage,
  targetLanguage,
  isStreaming = false,
}: Props) {
  const isMe = direction === "me_to_partner";

  return (
    <div className={`log-bubble${isMe ? " right" : ""}${isStreaming ? " live" : ""}`}>
      {!isMe && <div className="log-avatar">相</div>}
      <div>
        <div className="log-body">
          <div className="log-src">
            {sourceText}
            {isStreaming && !translatedText && <span className="caret" />}
          </div>
          <div className="log-tx">
            {translatedText
              ? <>{translatedText}{isStreaming && <span className="caret" />}</>
              : isStreaming
              ? <span className="caret" />
              : <span style={{ color: "var(--ink-4)" }}>—</span>
            }
          </div>
          <div className="log-row">
            <span className="log-lang">
              {LANGUAGE_LABELS[sourceLanguage]} → {LANGUAGE_LABELS[targetLanguage]}
            </span>
            {isStreaming && <span className="log-live-tag">● ライブ翻訳中</span>}
          </div>
        </div>
      </div>
      {isMe && <div className="log-avatar">私</div>}
    </div>
  );
}
