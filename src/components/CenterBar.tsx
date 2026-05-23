import { Icon } from "./Icon";

type Props = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export function Topbar({ sidebarOpen, onToggleSidebar }: Props) {
  return (
    <header className="topbar">
      <button
        className={`iconbtn${sidebarOpen ? " active" : ""}`}
        title={sidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
        onClick={onToggleSidebar}
      >
        <Icon name="panel-left" />
      </button>

      <div className="tb-sep" />

      <div className="brand">
        <span className="brand-mark">翻</span>
        <span className="brand-name">翻訳</span>
        <span className="brand-ver">Realtime</span>
      </div>

      <div className="tb-sep" />

      <div className="tb-status" title="OpenAI Realtime API に接続中">
        <span className="tb-dot" />
        <span>接続中</span>
        <span className="tb-latency">—</span>
      </div>

      <div className="tb-spacer" />

    </header>
  );
}
