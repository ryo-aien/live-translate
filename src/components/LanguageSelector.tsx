import type { LanguageCode } from "../types/translation";
import { PARTNER_LANGUAGES } from "../types/translation";

type Props = {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  disabled: boolean;
};

export function LanguageSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="section">
      <div className="section-label">相手の言語</div>
      <select
        className="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        disabled={disabled}
      >
        {PARTNER_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
