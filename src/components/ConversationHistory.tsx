import type { ConversationItem } from "../types/translation";
import { LANGUAGE_LABELS } from "../types/translation";

type Props = {
  items: ConversationItem[];
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export function ConversationHistory({ items }: Props) {
  return (
    <div className="history-panel">
      <div className="section-label">会話履歴</div>
      {items.length === 0 ? (
        <div className="history-empty">履歴はありません</div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={`history-item ${item.direction === "me_to_partner" ? "me" : "partner"}`}
          >
            <div className="history-meta">
              {formatTime(item.createdAt)}{" "}
              {LANGUAGE_LABELS[item.sourceLanguage]} →{" "}
              {LANGUAGE_LABELS[item.targetLanguage]}
            </div>
            <div className="history-source">{item.sourceText}</div>
            <div className="history-translated">{item.translatedText}</div>
          </div>
        ))
      )}
    </div>
  );
}
