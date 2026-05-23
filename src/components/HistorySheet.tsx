import type { ConversationItem, LanguageCode } from "../types/translation";
import { LANGUAGE_LABELS } from "../types/translation";
import { Icon } from "./Icon";

type Props = { items: ConversationItem[] };

const LANG_CODE: Record<LanguageCode, string> = { ja: "JA", en: "EN", zh: "ZH", ko: "KO" };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(items: ConversationItem[]) {
  const map = new Map<string, ConversationItem[]>();
  for (const item of items) {
    const d = new Date(item.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = "今日";
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = "昨日";
    } else {
      label = d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
    }
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return map;
}

export function Sidebar({ items }: Props) {
  const groups = groupByDate([...items].reverse());

  return (
    <aside className="sidebar">
      <div className="side-hd">
        <h3>セッション</h3>
        <button className="newbtn">
          <Icon name="plus" size={12} />
          新規
        </button>
      </div>

      <div className="side-search">
        <Icon name="search" size={13} />
        <input placeholder="履歴を検索..." readOnly />
        <kbd>⌘K</kbd>
      </div>

      <div className="sessions">
        {items.length === 0 ? (
          <div className="sessions-empty">履歴はありません</div>
        ) : (
          Array.from(groups.entries()).map(([day, group]) => (
            <div key={day}>
              <div className="day-label">{day}</div>
              {group.map((item) => (
                <div key={item.id} className="session">
                  <div>
                    <div className="session-title">
                      {item.sourceText || item.translatedText || "（空）"}
                    </div>
                    <div className="session-meta">
                      <span className="session-langs">
                        <span>{LANG_CODE[item.sourceLanguage]}</span>
                        <span>→</span>
                        <span>{LANGUAGE_LABELS[item.targetLanguage]}</span>
                      </span>
                    </div>
                  </div>
                  <span className="session-time">{formatTime(item.createdAt)}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

    </aside>
  );
}
