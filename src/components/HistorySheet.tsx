import type { ConversationItem, LanguageCode } from "../types/translation";
import { LANGUAGE_LABELS } from "../types/translation";
import { groupBySessions } from "../hooks/useConversationHistory";
import { Icon } from "./Icon";

type Props = { items: ConversationItem[] };

const LANG_FLAG: Record<LanguageCode, string> = { ja: "🇯🇵", en: "🇺🇸", zh: "🇨🇳", ko: "🇰🇷" };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "今日";
  if (d.toDateString() === yesterday.toDateString()) return "昨日";
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export function Sidebar({ items }: Props) {
  const sessions = groupBySessions(items);

  // group sessions by date
  const byDate = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const label = formatDate(s.startedAt);
    if (!byDate.has(label)) byDate.set(label, []);
    byDate.get(label)!.push(s);
  }

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
        {sessions.length === 0 ? (
          <div className="sessions-empty">履歴はありません</div>
        ) : (
          Array.from(byDate.entries()).map(([day, daySessions]) => (
            <div key={day}>
              <div className="day-label">{day}</div>
              {daySessions.map((sess) => {
                const langs = new Set<LanguageCode>();
                for (const item of sess.items) {
                  langs.add(item.sourceLanguage);
                  langs.add(item.targetLanguage);
                }
                const preview = sess.items[0]?.sourceText || sess.items[0]?.translatedText || "（空）";
                return (
                  <div key={sess.sessionId} className="session">
                    <div className="session-body">
                      <div className="session-title">{preview}</div>
                      <div className="session-meta">
                        <span className="session-langs">
                          {Array.from(langs).map(l => (
                            <span key={l} title={LANGUAGE_LABELS[l]}>{LANG_FLAG[l]}</span>
                          ))}
                        </span>
                        <span className="session-count">{sess.items.length}件</span>
                      </div>
                    </div>
                    <span className="session-time">{formatTime(sess.startedAt)}</span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
