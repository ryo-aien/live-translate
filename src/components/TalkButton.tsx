type Props = {
  label: string;
  directionLabel: string;
  variant: "me" | "partner";
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
};

export function TalkButton({
  label,
  directionLabel,
  variant,
  active,
  disabled,
  onToggle,
}: Props) {
  return (
    <button
      className={`talk-button ${variant}${active ? " active" : ""}`}
      disabled={disabled}
      onClick={onToggle}
    >
      <span>{active ? "■ 停止" : label}</span>
      <span className="talk-button-direction">{directionLabel}</span>
    </button>
  );
}
