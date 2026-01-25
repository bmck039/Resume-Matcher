# Resume Matcher セットアップガイド

[English](SETUP.md) | [Español](SETUP.es.md) | [简体中文](SETUP.zh-CN.md) | [**日本語**](SETUP.ja.md)

ようこそ！このガイドでは、ローカル環境で Resume Matcher をセットアップする手順を説明します。開発に参加したい方も、手元でアプリを動かしたい方も、この手順で始められます。

---

## 目次

- [前提条件](#prerequisites)
- [クイックスタート](#quick-start)
- [手順どおりにセットアップ](#step-by-step-setup)
  - [1. リポジトリをクローン](#1-clone-the-repository)
  - [2. バックエンドのセットアップ](#2-backend-setup)
  - [3. フロントエンドのセットアップ](#3-frontend-setup)
- [AI プロバイダの設定](#configuring-your-ai-provider)
  - [オプション A: クラウドプロバイダ](#option-a-cloud-providers)
  - [オプション B: Ollama によるローカル AI（無料）](#option-b-local-ai-with-ollama-free)
- [Docker デプロイ](#docker-deployment)
- [アプリへのアクセス](#accessing-the-application)
- [よく使うコマンド](#common-commands-reference)
- [トラブルシューティング](#troubleshooting)
- [プロジェクト構成](#project-structure-overview)
- [ヘルプ](#getting-help)

---

<a id="prerequisites"></a>
## 前提条件

開始前に、以下がインストールされていることを確認してください：

| ツール | 最低バージョン | 確認方法 | インストール |
|------|----------------|----------|--------------|
| **Python** | 3.13+ | `python --version` | [python.org](https://python.org) |
| **Node.js** | 22+ | `node --version` | [nodejs.org](https://nodejs.org) |
| **npm** | 10+ | `npm --version` | Node.js に同梱 |
| **uv** | 最新 | `uv --version` | [astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) |
| **Git** | 任意 | `git --version` | [git-scm.com](https://git-scm.com) |

### uv のインストール（Python パッケージマネージャ）

Resume Matcher は Python 依存関係の管理に `uv` を使用します。インストール方法：

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# または pip
pip install uv
```

---

<a id="quick-start"></a>
## クイックスタート

開発ツールに慣れていて、まず動かしたい方向け：

```bash
# 1. リポジトリをクローン
git clone https://github.com/srbhr/Resume-Matcher.git
cd Resume-Matcher

# 2. バックエンド起動（ターミナル 1）
cd apps/backend
cp .env.example .env        # テンプレートから設定を作成
uv sync                      # Python 依存関係をインストール
uv run uvicorn app.main:app --reload --port 8000

# 3. フロントエンド起動（ターミナル 2）
cd apps/frontend
npm install                  # Node.js 依存関係をインストール
npm run dev                  # 開発サーバを起動
```

ブラウザで **<http://localhost:3000>** を開けば OK です。

> **注意:** 利用前に AI プロバイダの設定が必要です。下の [AI プロバイダの設定](#configuring-your-ai-provider) を参照してください。

---

<a id="step-by-step-setup"></a>
## 手順どおりにセットアップ

<a id="1-clone-the-repository"></a>
### 1. リポジトリをクローン

まずはコードを取得します：

```bash
git clone https://github.com/srbhr/Resume-Matcher.git
cd Resume-Matcher
```

<a id="2-backend-setup"></a>
### 2. バックエンドのセットアップ

バックエンドは Python（FastAPI）で、AI 処理、履歴書の解析、データ保存を担当します。

#### バックエンドディレクトリへ移動

```bash
cd apps/backend
```

#### 環境ファイルを作成

```bash
cp .env.example .env
```

#### `.env` を好みのエディタで編集

```bash
# macOS/Linux
nano .env

# 好みのエディタでも OK
code .env   # VS Code
```

最重要設定は AI プロバイダです。OpenAI の最小例：

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-your-api-key-here

# ローカル開発では既定のままで OK
HOST=0.0.0.0
PORT=8000
FRONTEND_BASE_URL=http://localhost:3000
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
```

#### Python 依存関係をインストール

```bash
uv sync
```

仮想環境を作成し、必要なパッケージをインストールします。

#### バックエンドサーバを起動

```bash
uv run uvicorn app.main:app --reload --port 8000
```

次のような出力が表示されます：

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

**このターミナルは起動したまま**、フロントエンド用に別ターミナルを開きます。

<a id="3-frontend-setup"></a>
### 3. フロントエンドのセットアップ

フロントエンドは Next.js で、UI を提供します。

#### フロントエンドディレクトリへ移動

```bash
cd apps/frontend
```

#### （任意）フロントエンドの環境ファイルを作成

バックエンドを別ポートで動かす場合のみ必要です：

```bash
cp .env.sample .env.local
```

#### Node.js 依存関係をインストール

```bash
npm install
```

#### 開発サーバを起動

```bash
npm run dev
```

次のように表示されます：

```
▲ Next.js 16.x.x (Turbopack)
- Local:        http://localhost:3000
```

ブラウザで **<http://localhost:3000>** を開くと、Resume Matcher のダッシュボードが表示されます。

---

<a id="configuring-your-ai-provider"></a>
## AI プロバイダの設定

Resume Matcher は複数の AI プロバイダに対応しています。アプリ内の Settings ページ、またはバックエンドの `.env` を編集して設定できます。

<a id="option-a-cloud-providers"></a>
### オプション A: クラウドプロバイダ

| プロバイダ | 設定 | API キー取得先 |
|----------|------|----------------|
| **OpenAI** | `LLM_PROVIDER=openai`<br>`LLM_MODEL=gpt-4o-mini` | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Anthropic** | `LLM_PROVIDER=anthropic`<br>`LLM_MODEL=claude-3-5-sonnet-20241022` | [console.anthropic.com](https://console.anthropic.com/) |
| **Google Gemini** | `LLM_PROVIDER=gemini`<br>`LLM_MODEL=gemini-1.5-flash` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **OpenRouter** | `LLM_PROVIDER=openrouter`<br>`LLM_MODEL=anthropic/claude-3.5-sonnet` | [openrouter.ai](https://openrouter.ai/keys) |
| **DeepSeek** | `LLM_PROVIDER=deepseek`<br>`LLM_MODEL=deepseek-chat` | [platform.deepseek.com](https://platform.deepseek.com/) |

Anthropic の `.env` 例：

```env
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_API_KEY=sk-ant-your-key-here
```

<a id="option-b-local-ai-with-ollama-free"></a>
### オプション B: Ollama によるローカル AI（無料）

API コストなしでローカル実行したい場合は Ollama を使えます。

#### ステップ 1: Ollama をインストール

[ollama.com](https://ollama.com) からダウンロードしてインストールします。

#### ステップ 2: モデルを取得

```bash
ollama pull llama3.2
```

他の候補：`mistral`、`codellama`、`neural-chat`

#### ステップ 3: `.env` を設定

```env
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
LLM_API_BASE=http://localhost:11434
# Ollama では LLM_API_KEY は不要です
```

#### ステップ 4: Ollama が起動していることを確認

```bash
ollama serve
```

通常はインストール後に自動起動します。

---

<a id="docker-deployment"></a>
## Docker デプロイ

コンテナで動かしたい場合、Resume Matcher は Docker に対応しています。

### Docker Compose を使う（推奨）

```bash
# コンテナをビルドして起動
docker-compose up -d

# ログを見る
docker-compose logs -f

# コンテナ停止
docker-compose down
```

### Docker の注意点

- **API キーは UI から設定**：<http://localhost:3000/settings>（`.env` ではありません）
- データは Docker volume に永続化されます
- フロントエンド（3000）とバックエンド（8000）のポートが公開されます

<!-- 注：Docker ドキュメントは準備中です。現在は docker-compose.yml を参照してください -->

---

<a id="accessing-the-application"></a>
## アプリへのアクセス

両方のサーバが起動したら、ブラウザで以下にアクセスします：

| URL | 内容 |
|-----|------|
| **<http://localhost:3000>** | メインアプリ（Dashboard） |
| **<http://localhost:3000/settings>** | AI プロバイダ設定 |
| **<http://localhost:8000>** | バックエンド API ルート |
| **<http://localhost:8000/docs>** | 対話型 API ドキュメント |
| **<http://localhost:8000/health>** | バックエンドヘルスチェック |

### 初回セットアップチェックリスト

1. <http://localhost:3000/settings> を開く
2. AI プロバイダを選択
3. API キーを入力（または Ollama を設定）
4. "Save Configuration" をクリック
5. "Test Connection" をクリックして確認
6. Dashboard に戻り、最初の履歴書をアップロード

---

<a id="common-commands-reference"></a>
## よく使うコマンド

### バックエンド

```bash
cd apps/backend

# 開発サーバ（自動リロード）
uv run uvicorn app.main:app --reload --port 8000

# 本番サーバ
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# 依存関係のインストール
uv sync

# 開発用依存関係も含める（テスト用）
uv sync --group dev

# テスト実行
uv run pytest

# DB の状態確認（JSON ファイル）
ls -la data/
```

### フロントエンド

```bash
cd apps/frontend

# 開発サーバ（Turbopack）
npm run dev

# 本番ビルド
npm run build

# 本番起動
npm run start

# Lint
npm run lint

# Prettier で整形
npm run format

# 別ポートで起動
npm run dev -- -p 3001
```

### データベース管理

Resume Matcher は TinyDB（JSON ファイル保存）を使用します。データは `apps/backend/data/` にあります：

```bash
# DB ファイルを見る
ls apps/backend/data/

# バックアップ
cp -r apps/backend/data apps/backend/data-backup

# 全リセット（初期化）
rm -rf apps/backend/data
```

---

<a id="troubleshooting"></a>
## トラブルシューティング

### バックエンドが起動しない

**Error:** `ModuleNotFoundError`

`uv` で起動していることを確認してください：

```bash
uv run uvicorn app.main:app --reload
```

**Error:** `LLM_API_KEY not configured`

`.env` に選択したプロバイダ用の API キーが設定されているか確認してください。

### フロントエンドが起動しない

**Error:** ページ読み込み時に `ECONNREFUSED`

バックエンドが起動していません。先に起動してください：

```bash
cd apps/backend && uv run uvicorn app.main:app --reload
```

**Error:** build または TypeScript エラー

Next.js のキャッシュを削除します：

```bash
rm -rf apps/frontend/.next
npm run dev
```

### PDF のダウンロードに失敗する

**Error:** `Cannot connect to frontend for PDF generation`

バックエンドからフロントエンドへ接続できません。以下を確認してください：

1. フロントエンドが起動している
2. `.env` の `FRONTEND_BASE_URL` がフロントエンド URL と一致している
3. `CORS_ORIGINS` にフロントエンド URL が含まれている

フロントエンドが 3001 の場合：

```env
FRONTEND_BASE_URL=http://localhost:3001
CORS_ORIGINS=["http://localhost:3001", "http://127.0.0.1:3001"]
```

### Ollama の接続に失敗する

**Error:** `Connection refused to localhost:11434`

1. Ollama の稼働確認：`ollama list`
2. 必要なら起動：`ollama serve`
3. モデルが取得済みか確認：`ollama pull llama3.2`

---

<a id="project-structure-overview"></a>
## プロジェクト構成

```text
Resume-Matcher/
├─ apps/
│  ├─ backend/                 # Python FastAPI backend
│  │  ├─ app/
│  │  │  ├─ main.py            # Application entry point
│  │  │  ├─ config.py          # Environment configuration
│  │  │  ├─ database.py        # TinyDB wrapper
│  │  │  ├─ llm.py             # AI provider integration
│  │  │  ├─ routers/           # API endpoints
│  │  │  ├─ services/          # Business logic
│  │  │  └─ schemas/           # Data models
│  │  ├─ prompts/              # LLM prompt templates
│  │  ├─ data/                 # Database storage (auto-created)
│  │  ├─ .env.example          # Environment template
│  │  └─ pyproject.toml        # Python dependencies
│  └─ frontend/                # Next.js React frontend
│     ├─ app/                  # Pages (dashboard, builder, etc.)
│     ├─ components/           # Reusable React components
│     ├─ lib/                  # Utilities and API client
│     ├─ .env.sample           # Environment template
│     └─ package.json          # Node.js dependencies
├─ docs/                        # Additional documentation
├─ docker-compose.yml           # Docker configuration
├─ Dockerfile                   # Container build instructions
└─ README.md                    # Project overview
```

---

<a id="getting-help"></a>
## ヘルプ

困ったときは次を参照してください：

- **Discord:** [dsc.gg/resume-matcher](https://dsc.gg/resume-matcher) - 質問・議論に活発です
- **GitHub Issues:** [Issue を作成](https://github.com/srbhr/Resume-Matcher/issues)（バグ報告や要望）
- **ドキュメント:** 詳細は [docs/agent/](docs/agent/) を参照

### 参考ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [backend-guide.md](docs/agent/architecture/backend-guide.md) | バックエンドのアーキテクチャと API 詳細 |
| [frontend-workflow.md](docs/agent/architecture/frontend-workflow.md) | ユーザーフローとコンポーネント構成 |
| [style-guide.md](docs/agent/design/style-guide.md) | UI デザインシステム（Swiss International Style） |

---

## デスクトップアプリケーションの構築

Resume Matcher は Electron を使用してスタンドアロンデスクトップアプリケーションとしてパッケージ化できます。このセクションでは、macOS、Windows、および Linux 用の配布可能なアプリの構築をカバーします。

### デスクトップビルドの前提条件

基本的なセットアップに加えて、以下が必要です：
- **PyInstaller**: `pip install pyinstaller`（Python バックエンドをバンドルするため）
- **electron-builder**: 既に `package.json` に含まれています
- **プラットフォーム固有のツール**（下記参照）

### デスクトップビルドスクリプト

プロジェクトルートに移動して、これらのコマンドを使用します：

```bash
# 現在のプラットフォーム用にビルド
npm run build:electron-linux   # Linux (AppImage + deb)
npm run build:electron-mac     # macOS (DMG + ZIP)
npm run build:electron-windows # Windows (NSIS インストーラー + ポータブル)

# すべてのプラットフォーム用にビルド（Linux から）
npm run build:all-from-linux
```

ビルドされたアプリケーションは `dist/` フォルダーに表示されます。

### macOS ビルドとコード署名

本番環境対応の macOS アプリ（コード署名と notarization 付き）：

```bash
# 1 回限りのセットアップ（macOS 上）
bash scripts/setup-mac-signing.sh

# ビルド、署名、notarization 用に準備
bash scripts/build-mac-signed.sh

# Apple で notarize（オプション）
bash scripts/notarize-mac.sh
```

詳細な macOS 手順については、[docs/macos-build-guide.md](docs/macos-build-guide.md) を参照してください。

### Linux ビルド（AppImage + Deb）

```bash
npm run build:electron-linux
```

生成物：
- `Resume Matcher-*.AppImage` - ポータブル、ほとんどの Linux ディストリビューションで動作
- `resume-matcher*.deb` - Debian パッケージ（Ubuntu、Debian など）

### Windows ビルド（NSIS インストーラー + ポータブル）

```bash
npm run build:electron-windows
```

生成物：
- `Resume Matcher Setup *.exe` - NSIS インストーラー
- `Resume Matcher *.exe` - ポータブル版

Windows でのコード署名については、[CODE_SIGNING_GUIDE.md](CODE_SIGNING_GUIDE.md) を参照してください。

### クロスプラットフォームビルド（Linux から）

単一の Linux マシンからすべてのプラットフォーム用にビルド：

```bash
# Linux（ネイティブ）、Windows（Wine 経由）、macOS（ZIP のみ）をビルド
npm run build:all-from-linux
```

要件：
- Windows ビルド用 Wine: `sudo apt install wine wine32 wine64`
- Python 3.12+（PyInstaller 付き）

### コード署名と配布

本番環境配布の場合、コード署名されたアプリケーションが必要です：

| プラットフォーム | 要件 | コスト | プロセス |
|-----------|------|-------|---------|
| **macOS** | Apple Developer アカウント + Developer ID 証明書 | $99/年 | `scripts/setup-mac-signing.sh` を使用 |
| **Windows** | Authenticode 証明書（DigiCert、Sectigo など） | $99-300/年 | `electron-builder.json` で設定 |
| **Linux** | オプションの GPG 署名 | 無料 | AppImage/deb を手動で署名 |

プラットフォーム固有の署名手順の詳細については、[CODE_SIGNING_GUIDE.md](CODE_SIGNING_GUIDE.md) を参照してください。

---

## 貢献と開発

### 開発者向け

Resume Matcher に貢献したい場合：

1. **GitHub でリポジトリをフォーク**する
2. **機能ブランチを作成**: `git checkout -b feature/your-feature`
3. **変更を加える**ローカルでテスト
4. **テストを実行**: `cd apps/backend && uv run pytest`
5. **コード品質を確認**: `npm run lint && npm run format`
6. **フォークにプッシュ**してプルリクエストを作成

### 開発ワークフロー

```bash
# 自動リロードを使用して両方のサーバーを起動
npm run dev

# または別々のターミナルで
npm run dev:backend   # ターミナル 1
npm run dev:frontend  # ターミナル 2

# 次に Electron アプリを実行
npm run electron:dev
```

### プロジェクト構造

開発者向け主要ファイル：

```
Resume-Matcher/
├── apps/
│   ├── backend/app/
│   │   ├── llm.py           # AI プロバイダー統合（LiteLLM）
│   │   ├── routers/         # API エンドポイント
│   │   ├── services/        # ビジネスロジック（解析、改善）
│   │   ├── schemas/         # Pydantic モデル
│   │   └── prompts/         # LLM プロンプトテンプレート
│   └── frontend/
│       ├── components/      # React コンポーネント
│       ├── lib/api/         # API クライアントとフック
│       └── app/             # ページルート
│
├── electron/                # Electron アプリコード
│   ├── main.js              # メインプロセス
│   ├── preload.js           # サンドボックスセキュリティレイヤー
│   └── entitlements.mac.plist  # macOS 権限
│
├── scripts/                 # ビルドとユーティリティスクリプト
└── docs/agent/              # 詳細アーキテクチャドキュメンテーション
```

---

楽しい履歴書づくりを！Resume Matcher が役立ったら、[リポジトリに Star](https://github.com/srbhr/Resume-Matcher) と [Discord 参加](https://dsc.gg/resume-matcher) をぜひ。

