import type { Direction } from "../types/translation";

type Props = {
  direction: Direction;
  sourceText: string;
  translatedText: string;
  isStreaming?: boolean;
};

export function ChatBubble({ direction, sourceText, translatedText, isStreaming = false }: Props) {
  const side = direction === "me_to_partner" ? "me" : "partner";

  return (
    <div className={`bubble ${side}${isStreaming ? " live" : ""}`}>
      <div className="bubble-body">
        <p className="bubble-xlat">
          {translatedText}
          {isStreaming && <span className="cur" />}
        </p>
        {sourceText && <p className="bubble-src">{sourceText}</p>}
      </div>
    </div>
  );
}
