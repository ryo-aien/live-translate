# voice-bridge

対面向けリアルタイム双方向翻訳 Web アプリ。スマートフォン・PC のブラウザだけで動作し、1本のマイクで日本語と外国語を交互に翻訳します。

```
自分: 日本語 → 相手の言語
相手: 相手の言語 → 日本語
```

## 機能

- **リアルタイム翻訳** — OpenAI Realtime Translation API (WebRTC) による低遅延音声翻訳
- **デュアルセッション** — 自分・相手の2セッションを常時接続し、話者ボタンで即時切り替え（再接続なし）
- **AUTO モード** — 発話言語を自動検出して話者を切り替え
- **字幕表示** — 原文・翻訳文をリアルタイムストリーミング表示
- **会話ログ** — セッション単位でブラウザ（localStorage）に保存
- **音声読み上げ** — 翻訳音声を自動再生（ON/OFF 切り替え可）

## 対応言語

| 自分 | 相手 |
|------|------|
| 日本語 | English |
| 日本語 | 中文 |
| 日本語 | 한국어 |

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Node.js + Hono |
| AI | OpenAI Realtime Translation API |
| 通信 | WebRTC |
| ストレージ | localStorage（DB なし） |
| 本番環境 | Google Cloud Run |
| ローカル | Docker Compose |

## ローカル起動

### 前提

- Docker / Docker Compose
- OpenAI API キー

### 手順

```bash
# 1. 環境変数を設定
cp .env.example .env
# OPENAI_API_KEY=sk-xxxx を記入

# 2. 起動
docker compose up --build
```

ブラウザで `http://localhost:3080` を開く。

### .env.example

```env
OPENAI_API_KEY=sk-xxxx
NODE_ENV=development
PORT=8080
```

## ビルド・本番起動

```bash
npm run build
npm start
```

## Cloud Run デプロイ (Terraform)

### 必要なツール

インストールされていない場合は各リンクを参照してください。

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [gcloud CLI](https://cloud.google.com/sdk/docs/install)
- Docker

```bash
terraform -version
gcloud --version
docker --version
```

---

### 初回デプロイ

#### 1. gcloud 認証

```bash
make auth
```

#### 2. 請求先アカウントをプロジェクトにリンク

Artifact Registry / Secret Manager / Cloud Run の利用に必要です。

```bash
# 請求先アカウント ID を確認
gcloud billing accounts list

# プロジェクトにリンク
gcloud billing projects link your-gcp-project-id \
  --billing-account=XXXXXX-XXXXXX-XXXXXX
```

#### 3. 必要な権限を付与

`roles/owner` があればスキップ可。

```bash
# サービスアカウントの作成・管理
gcloud projects add-iam-policy-binding your-gcp-project-id \
  --member="user:your-email@example.com" \
  --role="roles/iam.serviceAccountAdmin"

# API の有効化・無効化
gcloud projects add-iam-policy-binding your-gcp-project-id \
  --member="user:your-email@example.com" \
  --role="roles/serviceusage.serviceUsageAdmin"

# Artifact Registry リポジトリの作成・管理
gcloud projects add-iam-policy-binding your-gcp-project-id \
  --member="user:your-email@example.com" \
  --role="roles/artifactregistry.admin"

# Secret Manager のシークレット作成・管理
gcloud projects add-iam-policy-binding your-gcp-project-id \
  --member="user:your-email@example.com" \
  --role="roles/secretmanager.admin"

# Cloud Run サービスのデプロイ・管理
gcloud projects add-iam-policy-binding your-gcp-project-id \
  --member="user:your-email@example.com" \
  --role="roles/run.admin"
```

#### 4. インフラ構築

API 有効化 / Artifact Registry / Secret Manager / サービスアカウントを作成します。  
最後に `OPENAI_API_KEY` の入力を求められます。

**既存の GCP プロジェクトを使う場合**

```bash
make bootstrap PROJECT_ID=your-gcp-project-id
```

**GCP プロジェクトを新規作成する場合**

```bash
make bootstrap \
  PROJECT_ID=your-new-project-id \
  BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX
```

#### 5. 初回デプロイ

Docker イメージをビルドして Artifact Registry へ push し、Cloud Run サービスを作成します。

```bash
make deploy PROJECT_ID=your-gcp-project-id
```

完了するとサービス URL が表示されます。

---

### 2回目以降（コード更新時）

```bash
make deploy PROJECT_ID=your-gcp-project-id
```

---

### 個別コマンド

```bash
make plan    # インフラ変更内容の確認（適用はしない）
make apply   # インフラのみ更新
make push    # イメージのビルドと push のみ
make secret  # OPENAI_API_KEY を Secret Manager に再登録
```

---

### トラブルシューティング

#### `BILLING_DISABLED` エラー

請求先アカウントがプロジェクトにリンクされていません。手順 2 を実行してください。

#### `alreadyExists` エラー（サービスアカウント等）

過去の実行で一部リソースが作成済みの場合、Terraform の state に取り込む必要があります：

```bash
terraform -chdir=infra import \
  -var="project_id=your-gcp-project-id" \
  -var="region=asia-northeast1" \
  -var="image_tag=dummy" \
  google_service_account.cloudrun \
  "projects/your-gcp-project-id/serviceAccounts/voice-bridge-run@your-gcp-project-id.iam.gserviceaccount.com"
```

その後 `make bootstrap PROJECT_ID=your-gcp-project-id` を再実行してください。

#### `PROJECT_ID` が意図しない値になる

`PROJECT_ID` を省略すると `gcloud config get-value project` の値が使われます。常に明示的に指定してください：

```bash
make bootstrap PROJECT_ID=your-gcp-project-id
make deploy PROJECT_ID=your-gcp-project-id
```

## アーキテクチャ

```
Browser ──POST /api/session──▶ Cloud Run (Hono)
                                      │
                                      ▼
                              OpenAI API
                              (client secret 発行)
                                      │
                              ◀───────┘
Browser ◀──WebRTC──────────▶ OpenAI Realtime Translation API
         (音声・字幕ストリーム)
```

OpenAI API キーはサーバー側のみに保持し、ブラウザには短命の client secret のみを渡します。

## API

### `POST /api/session`

翻訳セッションの client secret を発行します。

**Request**

```json
{
  "direction": "me_to_partner",
  "partnerLanguage": "en"
}
```

**Response**

```json
{
  "clientSecret": "ek_xxxx"
}
```

## ディレクトリ構成

```
voice-bridge/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── ActionBar.tsx      # マイクドック・波形
│   │   ├── CenterBar.tsx      # トップバー
│   │   ├── ChatBubble.tsx     # ログ表示バブル
│   │   ├── HistorySheet.tsx   # サイドバー履歴
│   │   ├── Icon.tsx
│   │   ├── TalkPanel.tsx      # 翻訳パネル
│   │   └── Waveform.tsx       # マイク音量ビジュアライザ
│   ├── hooks/
│   │   ├── useAutoTranslation.ts   # AUTO モード
│   │   ├── useConversationHistory.ts
│   │   └── useDualTranslation.ts   # デュアルセッション
│   └── types/
│       └── translation.ts
├── server/
│   ├── index.ts               # Hono サーバー
│   └── openai.ts              # OpenAI セッション発行
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## ライセンス

MIT
