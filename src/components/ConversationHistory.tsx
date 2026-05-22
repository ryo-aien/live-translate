import type { ConversationItem, LanguageCode } from "../types/translation";

type Props = {
  history: ConversationItem[];
  onClear: () => void;
};

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  ko: "한국어",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationHistory({ history, onClear }: Props) {
  return (
    <div className="conversation-history">
      <div className="history-header">
        <span className="history-title">会話履歴</span>
        {history.length > 0 && (
          <button className="clear-button" onClick={onClear}>
            クリア
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <div className="history-empty">履歴がありません</div>
      ) : (
        <ul className="history-list">
          {history.map((item) => (
            <li key={item.id} className="history-item">
              <div className="history-meta">
                <span className="history-time">{formatTime(item.createdAt)}</span>
                <span className="history-direction">
                  {LANGUAGE_LABELS[item.sourceLanguage]} →{" "}
                  {LANGUAGE_LABELS[item.targetLanguage]}
                </span>
              </div>
              <div className="history-source">{item.sourceText}</div>
              <div className="history-translated">{item.translatedText}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
