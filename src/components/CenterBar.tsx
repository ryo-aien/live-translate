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
      <div className="cb-lang">
        <span className="cb-lang-fixed">日本語</span>
        <span className="cb-lang-arrow">⇄</span>
        <div className="cb-lang-sel-wrap">
          <select
            className="cb-lang-sel"
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
          <span className="cb-lang-val">{LANGUAGE_LABELS[partnerLanguage]}</span>
        </div>
      </div>

      <div className="cb-actions">
        <button
          className={`cb-btn auto-pill${autoMode ? " on" : ""}`}
          onClick={onToggleAutoMode}
          aria-label={autoMode ? "自動検出オフ" : "自動検出オン"}
          title={autoMode ? "自動話者検出: ON" : "自動話者検出: OFF"}
        >
          AUTO
          {autoMode && <span className="auto-dot-live" />}
        </button>
        <button
          className={`cb-btn${audioEnabled ? "" : " muted"}`}
          onClick={onToggleAudio}
          aria-label={audioEnabled ? "音声をオフ" : "音声をオン"}
        >
          {audioEnabled ? "🔊" : "🔇"}
        </button>
        <button
          className="cb-btn"
          onClick={onOpenHistory}
          aria-label="会話履歴"
        >
          📋
          {historyCount > 0 && (
            <span className="h-badge">
              {historyCount > 9 ? "9+" : historyCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
