import type { Direction } from "../types/translation";
import type { AutoState, ActiveSpeaker } from "../hooks/useAutoTranslation";

type Props = {
  autoMode: boolean;
  activeDirection: Direction | null;
  isConnecting: boolean;
  isBusy: boolean;
  onToggle: (dir: Direction) => void;
  autoState: AutoState;
  activeSpeaker: ActiveSpeaker;
};

export function ActionBar({
  autoMode,
  activeDirection,
  isConnecting,
  isBusy,
  onToggle,
  autoState,
  activeSpeaker,
}: Props) {
  if (autoMode) {
    const statusMod =
      activeSpeaker === "me" ? "me-active" :
      activeSpeaker === "partner" ? "partner-active" : "";

    return (
      <div className="action-bar">
        <div className={`auto-status${statusMod ? ` ${statusMod}` : ""}`}>
          {autoState === "starting" ? (
            <>
              <div className="p-spinner" />
              <span className="auto-status-text">接続中…</span>
            </>
          ) : activeSpeaker ? (
            <>
              <div className="wave auto-wave">
                <span /><span /><span /><span /><span />
              </div>
              <span className="auto-status-text">
                {activeSpeaker === "me" ? "自分が話しています" : "相手が話しています"}
              </span>
            </>
          ) : (
            <>
              <div className="auto-idle-dots">
                <span /><span /><span />
              </div>
              <span className="auto-status-text">話しかけてください</span>
            </>
          )}
        </div>
      </div>
    );
  }

  const partnerActive = activeDirection === "partner_to_me" && !isConnecting;
  const partnerConn   = activeDirection === "partner_to_me" && isConnecting;
  const meActive      = activeDirection === "me_to_partner" && !isConnecting;
  const meConn        = activeDirection === "me_to_partner" && isConnecting;

  const partnerDisabled = isBusy && activeDirection !== "partner_to_me";
  const meDisabled      = isBusy && activeDirection !== "me_to_partner";

  return (
    <div className="action-bar">
      <div className="talk-btns">
        {/* partner button (left) */}
        <button
          className={[
            "talk-btn partner",
            partnerActive ? "active" : "",
            partnerConn   ? "connecting" : "",
            partnerDisabled ? "disabled" : "",
          ].filter(Boolean).join(" ")}
          onClick={() => onToggle("partner_to_me")}
          disabled={partnerDisabled}
          aria-label={partnerActive ? "停止" : "相手が話す"}
        >
          <div className="talk-btn-visual">
            {partnerConn ? (
              <div className="p-spinner" />
            ) : partnerActive ? (
              <div className="wave btn-wave"><span /><span /><span /><span /><span /></div>
            ) : (
              <span className="talk-btn-icon">🎤</span>
            )}
          </div>
          <span className="talk-btn-label">相手が話す</span>
        </button>

        {/* me button (right) */}
        <button
          className={[
            "talk-btn me",
            meActive ? "active" : "",
            meConn   ? "connecting" : "",
            meDisabled ? "disabled" : "",
          ].filter(Boolean).join(" ")}
          onClick={() => onToggle("me_to_partner")}
          disabled={meDisabled}
          aria-label={meActive ? "停止" : "自分が話す"}
        >
          <div className="talk-btn-visual">
            {meConn ? (
              <div className="p-spinner" />
            ) : meActive ? (
              <div className="wave btn-wave"><span /><span /><span /><span /><span /></div>
            ) : (
              <span className="talk-btn-icon">🎤</span>
            )}
          </div>
          <span className="talk-btn-label">自分が話す</span>
        </button>
      </div>
    </div>
  );
}
