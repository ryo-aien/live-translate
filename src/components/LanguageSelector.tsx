import type { LanguageCode } from "../types/translation";
import { partnerLanguages } from "../types/translation";

type Props = {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  disabled?: boolean;
};

export function LanguageSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="language-selector">
      <label htmlFor="partner-language">相手の言語</label>
      <select
        id="partner-language"
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        disabled={disabled}
      >
        {partnerLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
