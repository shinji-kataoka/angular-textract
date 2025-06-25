import { Component, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CameraService, CapturedImage } from './services/camera.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  title = '文字認識システム';

  // カメラ関連の状態
  isCameraActive = false;
  isCapturing = false;

  // 撮影された画像
  capturedImages: CapturedImage[] = [];

  // API関連
  lambdaUrl = ''; // AWS Lambda関数のURL
  isProcessing = false;
  extractedText = '';
  errorMessage = '';

  constructor(private cameraService: CameraService) {
    // 撮影された画像の監視
    this.cameraService.capturedImages$.subscribe(images => {
      this.capturedImages = images;
    });
  }

  ngOnDestroy() {
    this.stopCamera();
  }
  async startCamera() {
    try {
      this.errorMessage = '';
      this.isCameraActive = true;

      // カメラサービスからstreamを取得
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // 背面カメラを優先
        },
        audio: false
      });

      // ビデオ要素にstreamを設定
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play();
      }

      // サービスにもstreamを設定
      await this.cameraService.setStream(stream);

    } catch (error) {
      this.errorMessage = 'カメラの起動に失敗しました。カメラへのアクセス許可を確認してください。';
      this.isCameraActive = false;
      console.error('Camera start error:', error);
    }
  }

  stopCamera() {
    this.cameraService.stopCamera();
    this.isCameraActive = false;
  }  capturePhoto() {
    try {
      this.isCapturing = true;
      this.errorMessage = '';

      // ビデオ要素を直接渡す
      const videoElement = this.videoElement?.nativeElement;
      const capturedImage = this.cameraService.capturePhoto(videoElement);
      if (capturedImage) {
        this.cameraService.addCapturedImage(capturedImage);
      }
    } catch (error) {
      this.errorMessage = '写真の撮影に失敗しました。';
      console.error('Capture error:', error);
    } finally {
      this.isCapturing = false;
    }
  }
  retakePhoto(imageId: number) {
    // 現在の写真を削除
    this.cameraService.removeCapturedImage(imageId);
    // エラーメッセージと抽出結果をクリア
    this.errorMessage = '';
    this.extractedText = '';
  }

  async sendToLambda() {
    if (this.capturedImages.length !== 1) {
      this.errorMessage = '1枚の写真を撮影してください。';
      return;
    }

    if (!this.lambdaUrl.trim()) {
      this.errorMessage = 'AWS Lambda関数のURLを入力してください。';
      return;
    }

    try {
      this.isProcessing = true;
      this.errorMessage = '';
      this.extractedText = '';

      const result = await this.cameraService.sendImagesToLambda(this.lambdaUrl);
      this.extractedText = result.extractedText || result.text || JSON.stringify(result);

    } catch (error) {
      this.errorMessage = 'Lambda関数への送信に失敗しました。URLやネットワーク接続を確認してください。';
      console.error('Lambda send error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  clearAll() {
    this.cameraService.clearCapturedImages();
    this.extractedText = '';
    this.errorMessage = '';
  }

  canSendToLambda(): boolean {
    return this.capturedImages.length === 1 && !this.isProcessing && this.lambdaUrl.trim().length > 0;
  }

  // デバッグ用メソッド
  onVideoLoaded() {
    console.log('Video metadata loaded');
  }

  onVideoError(event: any) {
    console.error('Video error:', event);
    this.errorMessage = 'ビデオの読み込みエラーが発生しました。';
  }

  getVideoStatus(): string {
    if (!this.videoElement?.nativeElement) return 'N/A';
    const video = this.videoElement.nativeElement;
    const states = ['未読み込み', 'メタデータ読み込み中', 'データ読み込み中', '将来データ取得可能', '十分なデータ取得済み'];
    return states[video.readyState] || '不明';
  }

  getVideoResolution(): string {
    if (!this.videoElement?.nativeElement) return 'N/A';
    const video = this.videoElement.nativeElement;
    return `${video.videoWidth}x${video.videoHeight}`;
  }
}
