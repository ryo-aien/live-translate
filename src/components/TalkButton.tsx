import type { AppState, Direction, LanguageCode } from "../types/translation";

type Props = {
  direction: Direction;
  partnerLanguage: LanguageCode;
  appState: AppState;
  onStart: (direction: Direction) => void;
  onStop: () => void;
};

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  ko: "한국어",
};

export function TalkButton({
  direction,
  partnerLanguage,
  appState,
  onStart,
  onStop,
}: Props) {
  const isMyButton = direction === "me_to_partner";
  const label = isMyButton ? "自分が話す" : "相手が話す";
  const fromLang = isMyButton ? "日本語" : LANGUAGE_LABELS[partnerLanguage];
  const toLang = isMyButton ? LANGUAGE_LABELS[partnerLanguage] : "日本語";

  const isActive = appState === "recording" || appState === "connecting";
  const isDisabled =
    (appState !== "idle" && appState !== "error") ||
    false;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (appState === "idle" || appState === "error") {
      onStart(direction);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (appState === "recording" || appState === "connecting") {
      onStop();
    }
  };

  return (
    <div className={`talk-button-wrapper ${isActive ? "active" : ""}`}>
      <button
        className={`talk-button ${isActive ? "recording" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        disabled={isDisabled && !isActive}
        aria-label={label}
      >
        {label}
      </button>
      <div className="talk-direction">
        {fromLang} → {toLang}
      </div>
    </div>
  );
}
