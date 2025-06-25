# 文字認識システム (Camera OCR App)

ブラウザのカメラを使用して写真を撮影し、AWS Lambdaで文字認識（OCR）を行うAngularアプリケーションです。

## 概要

このアプリケーションは以下の機能を提供します：
- ブラウザでのカメラアクセス
- リアルタイムカメラプレビュー
- 写真撮影機能
- AWS Lambda関数への画像送信
- OCR（光学文字認識）による文字抽出

## 技術スタック

- **フレームワーク**: Angular 20.0.2
- **言語**: TypeScript
- **UI**: HTML5 Canvas, WebRTC API
- **バックエンド**: AWS Lambda
- **認証**: なし（直接URL指定）

## プロジェクト構成

```
src/
├── app/
│   ├── app.ts              # メインコンポーネント
│   ├── app.html            # メインテンプレート
│   ├── app.css             # メインスタイル
│   ├── app.config.ts       # アプリケーション設定
│   └── services/
│       └── camera.service.ts  # カメラ操作サービス
├── index.html              # エントリーポイント
├── main.ts                 # アプリケーション起動
└── styles.css              # グローバルスタイル
```

## 主要機能の詳細

### 1. カメラ機能 (`CameraService`)

#### **MediaStream取得**
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'environment' // 背面カメラを優先
  },
  audio: false
});
```

#### **写真撮影プロセス**
1. HTMLVideoElementからフレームをキャプチャ
2. HTMLCanvasElementに描画
3. JPEG形式（品質80%）でエンコード
4. Base64 DataURLとBlobの両方を生成

#### **画像データ構造**
```typescript
interface CapturedImage {
  id: number;        // 一意識別子
  dataUrl: string;   // Base64エンコードされた画像データ
  blob: Blob;        // バイナリ形式（送信用）
  timestamp: Date;   // 撮影時刻
}
```

### 2. メインコンポーネント (`App`)

#### **状態管理**
- `isCameraActive`: カメラの動作状態
- `isCapturing`: 撮影処理中フラグ
- `capturedImages`: 撮影済み画像配列（最大1枚）
- `isProcessing`: Lambda処理中フラグ
- `extractedText`: 抽出されたテキスト
- `errorMessage`: エラーメッセージ

#### **主要メソッド**

**カメラ開始**
```typescript
async startCamera() {
  // MediaDevices APIでカメラストリーム取得
  // HTMLVideoElementに設定
  // CameraServiceにストリーム渡し
}
```

**写真撮影**
```typescript
capturePhoto() {
  // ビデオ要素からフレーム撮影
  // CapturedImageオブジェクト生成
  // サービスに画像追加
}
```

**Lambda送信**
```typescript
async sendToLambda() {
  // FormDataでmultipart/form-data作成
  // 'image'フィールドにBlob添付
  // POST リクエストでLambda関数実行
}
```

### 3. 画像処理フロー

```
カメラストリーム → HTMLVideoElement → HTMLCanvasElement →
DataURL (表示用) + Blob (送信用) → FormData → AWS Lambda
```

#### **画像変換詳細**
1. **キャンバス描画**: `context.drawImage(video, 0, 0, width, height)`
2. **JPEG変換**: `canvas.toDataURL('image/jpeg', 0.8)`
3. **Blob生成**: Base64デコード → ArrayBuffer → Uint8Array → Blob

### 4. AWS Lambda連携

#### **送信データ形式**
- **Content-Type**: `multipart/form-data`
- **フィールド名**: `image`
- **ファイル名**: `photo.jpg`
- **MIME Type**: `image/jpeg`

#### **期待するレスポンス**
```json
{
  "extractedText": "認識されたテキスト",
  "text": "代替フィールド",
  // その他のLambda固有フィールド
}
```

## セットアップと実行

### 開発サーバー起動
```bash
ng serve
```
ブラウザで `http://localhost:4200/` にアクセス

### ビルド
```bash
ng build
```

### 使用方法
1. アプリケーションを開く
2. 「カメラを開始」ボタンをクリック
3. カメラ許可を承認
4. 「写真を撮る」ボタンで撮影
5. AWS Lambda関数のURLを入力
6. 「文字認識実行」ボタンで処理開始
7. 抽出されたテキストを確認

## 必要な権限

- **カメラアクセス**: `navigator.mediaDevices.getUserMedia()`
- **HTTPS**: 本番環境ではHTTPS必須（localhost除く）

## 対応ブラウザ

- Chrome 53+
- Firefox 36+
- Safari 11+
- Edge 79+

## AWS Lambda設定要件

Lambda関数は以下を満たす必要があります：
- **HTTPSエンドポイント**
- **CORS設定**: ブラウザからのリクエスト許可
- **multipart/form-data**: ファイルアップロード対応
- **OCRライブラリ**: Tesseract, AWS Textract等

## 制限事項

- 1度に1枚の画像のみ処理
- 画像形式：JPEG固定
- ファイルサイズ：Lambda関数の制限に依存
- ネットワーク：インターネット接続必須

## トラブルシューティング

### カメラが起動しない
- ブラウザのカメラ許可を確認
- HTTPSでアクセスしているか確認（localhost除く）
- 他のアプリケーションがカメラを使用していないか確認

### Lambda送信エラー
- URLが正しいか確認
- Lambda関数のCORS設定を確認
- ネットワーク接続を確認

### 文字認識精度向上
- 明るい環境で撮影
- 文字がはっきり見えるよう距離調整
- 手ブレを避ける
