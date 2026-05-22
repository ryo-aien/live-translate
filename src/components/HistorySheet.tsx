import type { ConversationItem } from "../types/translation";
import { LANGUAGE_LABELS } from "../types/translation";

type Props = {
  items: ConversationItem[];
  onClose: () => void;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistorySheet({ items, onClose }: Props) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <span className="sheet-title">会話履歴</span>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>

        <div className="sheet-body">
          {items.length === 0 ? (
            <p className="sheet-empty">履歴はありません</p>
          ) : (
            <div className="sheet-list">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`sheet-item ${item.direction === "me_to_partner" ? "me" : "partner"}`}
                >
                  <div className="sheet-bar" />
                  <div className="sheet-body-col">
                    <p className="sheet-meta">
                      {formatTime(item.createdAt)}{" "}
                      {LANGUAGE_LABELS[item.sourceLanguage]} →{" "}
                      {LANGUAGE_LABELS[item.targetLanguage]}
                    </p>
                    <p className="sheet-src">{item.sourceText}</p>
                    <p className="sheet-xlat">{item.translatedText}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
