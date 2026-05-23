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

### 前提

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [gcloud CLI](https://cloud.google.com/sdk/docs/install)
- Docker

### 手順

#### 1. 認証

```bash
make auth
```

#### 2. 初回セットアップ

**既存プロジェクトを使う場合**

```bash
make bootstrap PROJECT_ID=your-gcp-project-id
```

**プロジェクトを新規作成する場合**

```bash
# 請求先アカウント ID を確認
gcloud billing accounts list

# 組織配下に作成
make bootstrap \
  PROJECT_ID=your-gcp-project-id \
  BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX \
  ORG_ID=000000000000

# フォルダ配下に作成
make bootstrap \
  PROJECT_ID=your-gcp-project-id \
  BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX \
  FOLDER_ID=000000000000
```

`bootstrap` は以下をまとめて実行します：
1. Terraform init
2. GCP プロジェクト作成（新規の場合）
3. API 有効化 / Artifact Registry / Secret Manager / Cloud Run / IAM 構築
4. OPENAI_API_KEY を Secret Manager に登録（対話入力）

#### 3. デプロイ

```bash
make deploy PROJECT_ID=your-gcp-project-id
```

`IMAGE_TAG` は未指定の場合、git の short SHA が自動使用されます。

#### 更新デプロイ

コードを変更したら同じコマンドで再デプロイできます。

```bash
make deploy PROJECT_ID=your-gcp-project-id
```

### 個別コマンド

```bash
make plan    # terraform plan（変更内容の確認）
make apply   # インフラのみ更新
make push    # イメージのビルドと push のみ
make secret  # OPENAI_API_KEY を Secret Manager に再登録
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
