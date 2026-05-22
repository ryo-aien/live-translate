type Props = {
  label: string;
  directionLabel: string;
  variant: "me" | "partner";
  active: boolean;
  connecting: boolean;
  disabled: boolean;
  onToggle: () => void;
};

export function TalkButton({
  label,
  directionLabel,
  variant,
  active,
  connecting,
  disabled,
  onToggle,
}: Props) {
  const renderInner = () => {
    if (connecting) {
      return (
        <>
          <div className="btn-spinner" />
          <span className="talk-button-label">接続中…</span>
          <span className="talk-button-direction">{directionLabel}</span>
        </>
      );
    }
    if (active) {
      return (
        <>
          <span className="talk-button-label">
            <span className="rec-dot" />
            停止
          </span>
          <span className="talk-button-direction">{directionLabel}</span>
        </>
      );
    }
    return (
      <>
        <span className="talk-button-icon">🎤</span>
        <span className="talk-button-label">{label}</span>
        <span className="talk-button-direction">{directionLabel}</span>
      </>
    );
  };

  return (
    <button
      className={`talk-button ${variant}${active || connecting ? " active" : ""}`}
      disabled={disabled}
      onClick={onToggle}
    >
      {renderInner()}
    </button>
  );
}
