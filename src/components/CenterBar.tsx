import type { LanguageCode } from "../types/translation";
import { PARTNER_LANGUAGES, LANGUAGE_LABELS } from "../types/translation";

type Props = {
  partnerLanguage: LanguageCode;
  onChangePartnerLanguage: (lang: LanguageCode) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  historyCount: number;
  onOpenHistory: () => void;
  autoMode: boolean;
  onToggleAutoMode: () => void;
  disabled: boolean;
};

export function CenterBar({
  partnerLanguage,
  onChangePartnerLanguage,
  audioEnabled,
  onToggleAudio,
  historyCount,
  onOpenHistory,
  autoMode,
  onToggleAutoMode,
  disabled,
}: Props) {
  return (
    <div className="center-bar">
      <div className="center-lang">
        <span className="lang-fixed">日本語</span>
        <span className="lang-arrow">⇄</span>
        <div className="lang-select-wrap">
          <select
            className="lang-select"
            value={partnerLanguage}
            onChange={(e) => onChangePartnerLanguage(e.target.value as LanguageCode)}
            disabled={disabled}
          >
            {PARTNER_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="lang-select-value">{LANGUAGE_LABELS[partnerLanguage]}</span>
        </div>
      </div>

      <div className="center-actions">
        <button
          className={`bar-btn auto-btn${autoMode ? " auto-btn-on" : ""}`}
          onClick={onToggleAutoMode}
          aria-label={autoMode ? "自動検出オフ" : "自動検出オン"}
          title={autoMode ? "自動話者検出: ON" : "自動話者検出: OFF"}
        >
          <span className="auto-btn-label">AUTO</span>
          {autoMode && <span className="auto-dot" />}
        </button>
        <button
          className={`bar-btn${audioEnabled ? "" : " bar-btn-off"}`}
          onClick={onToggleAudio}
          aria-label={audioEnabled ? "音声をオフ" : "音声をオン"}
        >
          {audioEnabled ? "🔊" : "🔇"}
        </button>
        <button
          className="bar-btn"
          onClick={onOpenHistory}
          aria-label="会話履歴"
        >
          📋
          {historyCount > 0 && (
            <span className="history-badge">
              {historyCount > 9 ? "9+" : historyCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
