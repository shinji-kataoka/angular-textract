# Angular Textract - シリアル番号抽出アプリ

AWS Textractを使用して画像からシリアル番号を自動抽出するAngularアプリケーションです。

## 🎯 主な機能

- **📷 写真撮影**: カメラで3枚の画像を撮影
- **🔍 テキスト抽出**: AWS Textractを使用してOCR処理
- **🏷️ シリアル番号抽出**: 特定のキーワード後のシリアル番号を自動抽出
- **✏️ 手動選択**: 抽出されたシリアル番号から任意選択
- **📝 フォーム入力**: 選択したシリアル番号をフォームに挿入

## 📋 対応するシリアル番号フォーマット

以下のキーワードの後にあるシリアル番号を抽出します：

### サポートキーワード
- `Serial No.`, `Serial No`, `serial no`, `serial n`
- `No.`, `No`, `no`
- `Number`, `number`

### サポート文字
- **英数字**: A-Z, a-z, 0-9
- **ハイフン**: -

### 抽出例
```
Serial No: ABC123       → ABC123
serial no. XYZ-789     → XYZ-789
No - TEST-001-A        → TEST-001-A
Number: 12345-ABCD     → 12345-ABCD
```

## 🚀 セットアップ

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd angular-textract
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. AWS認証情報の設定

#### ローカル開発用
環境設定ファイルを作成：
```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

`src/environments/environment.ts`を編集：
```typescript
export const environment = {
  production: false,
  aws: {
    accessKeyId: 'your_actual_access_key',
    secretAccessKey: 'your_actual_secret_key',
    region: 'ap-northeast-2'
  }
};
```

#### Amplify本番環境用
Amplifyコンソールで以下の環境変数を設定：
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### 4. アプリケーションの起動
```bash
ng serve
```

## 📱 使用方法

1. **写真撮影**
   - 「カメラを起動」ボタンをクリック
   - 3枚の画像を撮影（シリアル番号が含まれる部分を明確に撮影）

2. **テキスト抽出**
   - 3枚撮影完了後、「送信」ボタンをクリック
   - AWS Textractがテキスト抽出を実行

3. **シリアル番号選択**
   - 抽出されたシリアル番号が「画像X: シリアル番号」形式で表示
   - 任意のシリアル番号の「選択」ボタンをクリック

4. **フォーム入力**
   - 選択したシリアル番号がフォームに自動入力
   - 必要に応じて手動編集も可能

## 🏗️ プロジェクト構造

```
src/
├── app/
│   ├── services/
│   │   ├── camera.service.ts         # カメラ操作
│   │   └── textract.service.ts       # AWS Textract処理
│   ├── app.ts                        # メインコンポーネント
│   ├── app.html                      # UIテンプレート
│   └── app.css                       # スタイル
├── environments/
│   ├── environment.example.ts        # 環境設定テンプレート
│   └── environment.ts                # 実際の環境設定（Git除外）
└── ...
```

## 🔧 技術スタック

- **Frontend**: Angular 20+
- **OCR**: AWS Textract
- **言語**: TypeScript
- **スタイル**: CSS
- **パッケージマネージャー**: npm

## 🔒 セキュリティ

### Git除外設定
以下のファイルはGitHubにアップロードされません：

```gitignore
.env
.env.local
.env.*.local
src/environments/environment.ts
src/environments/environment.prod.ts
```

### AWS認証情報管理
- 開発環境: 環境変数ファイル（`.env`）
- 本番環境: デプロイメントプラットフォームの環境変数設定

## 📊 AWS Textract処理フロー

```
画像撮影 → Base64変換 → バイナリ変換 → Textract送信
    ↓
テキスト抽出 → 行単位結合 → 正規表現マッチ → シリアル番号抽出
    ↓
UI表示 → 手動選択 → フォーム入力
```

## ⚙️ 環境要件

- **Node.js**: 18.x以上
- **Angular CLI**: 20.x以上
- **AWS Account**: Textractサービス利用可能
- **ブラウザ**: カメラアクセス対応

## 🛠️ 開発・デバッグ

### 開発サーバー起動
```bash
ng serve
```

### ビルド
```bash
ng build
```

### エラー確認
ブラウザの開発者ツールでコンソールログを確認：
```typescript
console.error('Textract処理エラー:', error);
```

## 🚀 本番デプロイ

### 環境変数設定例（Vercel）
```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_REGION=ap-northeast-2
```

### 環境変数設定例（Netlify）
サイト設定 → Environment variables で設定

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

1. フォークしてください
2. フィーチャーブランチを作成してください (`git checkout -b feature/amazing-feature`)
3. 変更をコミットしてください (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュしてください (`git push origin feature/amazing-feature`)
5. プルリクエストを作成してください

## 📞 サポート

問題や質問がございましたら、Issueを作成してください。

---

**⚠️ 注意**: 実際のAWS認証情報をコードにハードコーディングしないでください。必ず環境変数を使用してください。
