# voice-bridge 実装仕様

## 1. 概要

iPhone / Android / PC のブラウザだけで使える、対面向けリアルタイム双方向翻訳Webアプリ。

```txt
自分: 日本語 → 相手の言語
相手: 相手の言語 → 日本語
```

OpenAI Realtime API はブラウザ等のクライアント接続では WebRTC が推奨されています。Cloud Run はコンテナの `PORT` 環境変数で待ち受ける必要があります。([OpenAI デベロッパーズ][1])

---

## 2. 技術構成

```txt
Frontend: React + TypeScript + Vite
Backend: Node.js + Hono
Runtime: Docker
Local: Docker Compose
Production: Google Cloud Run
AI: OpenAI Realtime API / Translation
通信: WebRTC
認証: なし
DB: なし
保存: localStorage
```

---

## 3. アーキテクチャ

```txt
Browser
  ↓ GET /
Cloud Run / Hono
  ↓
React Web App

Browser
  ↓ POST /api/session
Cloud Run / Hono
  ↓
OpenAI Realtime client secret 作成

Browser
  ↓ WebRTC
OpenAI Realtime API
  ↓
翻訳音声 / transcript
Browser
```

通常の OpenAI API キーはブラウザに置かず、Cloud Run 側で短命の接続情報を発行する。

---

## 4. 対応言語

```ts
type LanguageCode = "ja" | "en" | "zh" | "ko";
```

```ts
const partnerLanguages = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
] as const;
```

MVPでは以下を対象にする。

```txt
日本語 ⇄ 英語
日本語 ⇄ 中国語
日本語 ⇄ 韓国語
```

---

## 5. 翻訳方向

```ts
type Direction = "me_to_partner" | "partner_to_me";
```

### `me_to_partner`

```txt
入力: 日本語
出力: 選択した相手言語
```

### `partner_to_me`

```txt
入力: 選択した相手言語
出力: 日本語
```

---

## 6. MVP機能

```txt
- 相手言語選択
- 自分が話すボタン
- 相手が話すボタン
- Push-to-talk
- マイク入力
- 翻訳音声再生
- 原文字幕表示
- 翻訳字幕表示
- 会話履歴表示
- localStorage保存
```

---

## 7. 非対応

```txt
- ログイン
- ユーザー管理
- DB保存
- 課金
- 管理画面
- 外部マイク2本による話者分離
- Bluetooth複数マイク
- 完全自動話者判定
- オフライン翻訳
```

---

## 8. 画面仕様

```txt
┌────────────────────────────┐
│ Voice Bridge                │
├────────────────────────────┤
│ 相手の言語                   │
│ [ English ▼ ]               │
├────────────────────────────┤
│ [ 自分が話す ]               │
│ 日本語 → English             │
├────────────────────────────┤
│ [ 相手が話す ]               │
│ English → 日本語             │
├────────────────────────────┤
│ 原文                         │
│ ...                          │
│                              │
│ 翻訳                         │
│ ...                          │
├────────────────────────────┤
│ 会話履歴                     │
│ 10:30 日本語 → English       │
│ ...                          │
└────────────────────────────┘
```

---

## 9. 操作仕様

### 自分が話す

```txt
1. ユーザーが「自分が話す」を押す
2. direction = me_to_partner
3. targetLanguage = selectedLanguage
4. /api/session を呼ぶ
5. WebRTC接続を作成
6. マイク音声を送信
7. 翻訳音声を再生
8. 原文/翻訳字幕を表示
9. 会話履歴に保存
```

### 相手が話す

```txt
1. ユーザーが「相手が話す」を押す
2. direction = partner_to_me
3. targetLanguage = ja
4. /api/session を呼ぶ
5. WebRTC接続を作成
6. マイク音声を送信
7. 日本語翻訳音声を再生
8. 原文/翻訳字幕を表示
9. 会話履歴に保存
```

---

## 10. 状態管理

```ts
type AppState =
  | "idle"
  | "connecting"
  | "ready"
  | "recording"
  | "translating"
  | "playing"
  | "error";
```

---

## 11. データ型

```ts
type ConversationItem = {
  id: string;
  direction: Direction;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  sourceText: string;
  translatedText: string;
  createdAt: string;
};
```

---

## 12. Backend API

### `POST /api/session`

#### Request

```json
{
  "direction": "me_to_partner",
  "partnerLanguage": "en"
}
```

#### Response

```json
{
  "clientSecret": "xxxx",
  "expiresAt": 1234567890
}
```

### Backend側の実装詳細

```txt
- OpenAI APIキーを保持する
- ブラウザ用の短命 client secret を発行する（POST /v1/realtime/translations/client_secrets）
- モデル: gpt-realtime-translate
- セッション設定:
  - session.audio.output.language に出力言語コードを指定
  - session.audio.input.transcription.model に "gpt-realtime-whisper" を指定
    （これがないと session.input_transcript.delta イベントが発火しない）
- OpenAI レスポンスの value フィールドが client secret の値（形式: ek_xxxx）
- APIキーをフロントへ返さない
- CORSを必要最小限にする
```

#### OpenAI へのリクエスト例

```json
{
  "session": {
    "model": "gpt-realtime-translate",
    "audio": {
      "input": {
        "transcription": { "model": "gpt-realtime-whisper" }
      },
      "output": { "language": "en" }
    }
  }
}
```

---

## 13. Frontend WebRTC仕様

SDP オファーの送信先: `POST https://api.openai.com/v1/realtime/translations/calls`

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  audio: true,
});

const pc = new RTCPeerConnection();

for (const track of stream.getTracks()) {
  pc.addTrack(track, stream);
}

const audio = new Audio();
audio.autoplay = true;

pc.ontrack = (event) => {
  audio.srcObject = event.streams[0];
};

const dc = pc.createDataChannel("oai-events");

dc.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // 翻訳セッション専用イベント名（voice-agentセッションとは異なる）
  if (data.type === "session.input_transcript.delta") {
    // 原文字幕更新: data.delta
  } else if (data.type === "session.output_transcript.delta") {
    // 翻訳字幕更新: data.delta
  } else if (data.type === "session.closed") {
    // セッション終了 → 会話履歴保存
  }
};

// SDP オファーを作成して OpenAI へ送信し、WebRTC 接続を確立する
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

const sdpResponse = await fetch(
  "https://api.openai.com/v1/realtime/translations/calls",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clientSecret}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp,
  }
);

await pc.setRemoteDescription({
  type: "answer",
  sdp: await sdpResponse.text(),
});
```

---

## 14. Push-to-talk仕様

MVPでは「押している間だけ録音」。

```txt
pointerdown:
  - 状態を recording に変更
  - session開始
  - マイク送信開始

pointerup:
  - マイク送信停止
  - 状態を translating に変更
  - 翻訳完了後 playing / idle に戻す
```

スマホ対応のため、`mousedown/mouseup` ではなく `pointerdown/pointerup` を使う。

---

## 15. ローカル開発

### `.env`

```env
OPENAI_API_KEY=sk-xxxx
NODE_ENV=development
PORT=8080
```

### `docker-compose.yml`

```yaml
services:
  app:
    build:
      context: .
      target: development
    ports:
      - "8080:8080"
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      NODE_ENV: development
      PORT: 8080
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
```

### 起動

```bash
docker compose up --build
```

アクセス:

```txt
http://localhost:8080
```

---

## 16. Dockerfile

```dockerfile
FROM node:22-slim AS base
WORKDIR /app

FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev"]

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

EXPOSE 8080
CMD ["npm", "run", "start"]
```

---

## 17. Cloud Run仕様

```txt
Service: voice-bridge
Port: process.env.PORT || 8080
Env:
  OPENAI_API_KEY
  NODE_ENV=production
```

Cloud Run は `PORT` 環境変数をコンテナに注入するため、サーバー側は固定ポートではなく `process.env.PORT` を使う。([Google Cloud Documentation][2])

---

## 18. 推奨ディレクトリ構成

```txt
voice-bridge/
  src/
    App.tsx
    main.tsx
    components/
      LanguageSelector.tsx
      TalkButton.tsx
      TranscriptPanel.tsx
      ConversationHistory.tsx
    hooks/
      useRealtimeTranslation.ts
      useConversationHistory.ts
    types/
      translation.ts
  server/
    index.ts
    openai.ts
  public/
  Dockerfile
  docker-compose.yml
  package.json
  tsconfig.json
  vite.config.ts
  .env.example
  README.md
```

---

## 19. package scripts

```json
{
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node server/index.js",
    "lint": "eslint ."
  }
}
```

---

## 20. エラー仕様

```ts
type AppErrorCode =
  | "microphone_permission_denied"
  | "session_create_failed"
  | "webrtc_connection_failed"
  | "translation_failed"
  | "audio_playback_failed"
  | "network_error";
```

表示文言:

```txt
microphone_permission_denied:
  マイク権限が必要です。

session_create_failed:
  翻訳セッションを開始できませんでした。

webrtc_connection_failed:
  音声接続に失敗しました。

translation_failed:
  翻訳に失敗しました。

audio_playback_failed:
  音声を再生できませんでした。
```

---

## 21. 実装順

```txt
1. Vite + React + TypeScript 初期化
2. Honoサーバー作成
3. Dockerfile / docker-compose.yml 作成
4. Cloud Run用に PORT 対応
5. /api/session 実装
6. マイク権限取得
7. WebRTC接続
8. 翻訳音声再生
9. 字幕イベント処理
10. Push-to-talk実装
11. 会話履歴 localStorage 実装
12. Cloud Runデプロイ
```

---

## 22. 採用方針

```txt
Pythonは使わない。
TypeScriptのみで frontend / backend を統一する。
認証なし。
DBなし。
Cloud Run単体にデプロイする。
ローカルはDocker Composeで起動する。
```
