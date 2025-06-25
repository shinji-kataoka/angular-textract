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

  // カメラ関連の状態
  isCameraActive = false;
  isCapturing = false;

  // 撮影された画像
  capturedImages: CapturedImage[] = [];
  selectedImage: CapturedImage | null = null;

  // API関連
  lambdaUrl = '';
  isProcessing = false;
  extractedText = '';
  errorMessage = '';

  constructor(private cameraService: CameraService) {
    this.cameraService.capturedImages$.subscribe(images => {
      this.capturedImages = images;
    });
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
  async startCamera(): Promise<void> {
    try {
      this.clearMessages();
      this.isCameraActive = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        },
        audio: false
      });

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play();
      }

      await this.cameraService.setStream(stream);
    } catch (error) {
      this.handleError('カメラの起動に失敗しました。カメラへのアクセス許可を確認してください。', error);
      this.isCameraActive = false;
    }
  }

  stopCamera(): void {
    this.cameraService.stopCamera();
    this.cameraService.clearCapturedImages();
    this.clearMessages();
    this.selectedImage = null;
    this.isCameraActive = false;
  }  capturePhoto(): void {
    try {
      this.isCapturing = true;
      this.clearMessages();

      const videoElement = this.videoElement?.nativeElement;
      const capturedImage = this.cameraService.capturePhoto(videoElement);
      if (capturedImage) {
        this.cameraService.addCapturedImage(capturedImage);
      }
    } catch (error) {
      this.handleError('写真の撮影に失敗しました。', error);
    } finally {
      this.isCapturing = false;
    }
  }

  retakePhoto(imageId: number): void {
    this.cameraService.removeCapturedImage(imageId);
    this.clearMessages();
  }

  async sendToLambda(): Promise<void> {
    if (!this.validateSendConditions()) return;

    try {
      this.isProcessing = true;
      this.clearMessages();

      const result = await this.cameraService.sendImagesToLambda(this.lambdaUrl);
      this.extractedText = result.extractedText || result.text || JSON.stringify(result);
    } catch (error) {
      this.handleError('Lambda関数への送信に失敗しました。URLやネットワーク接続を確認してください。', error);
    } finally {
      this.isProcessing = false;
    }
  }

  clearAll(): void {
    this.cameraService.clearCapturedImages();
    this.clearMessages();
  }

  canSendToLambda(): boolean {
    return this.capturedImages.length === 1 && !this.isProcessing && this.lambdaUrl.trim().length > 0;
  }

  // 画像モーダル関連
  openImageModal(image: CapturedImage): void {
    this.selectedImage = image;
  }

  closeImageModal(): void {
    this.selectedImage = null;
  }

  confirmImage(): void {
    this.closeImageModal();
  }

  retakePhotoAndCloseModal(imageId: number): void {
    this.closeImageModal();
    this.retakePhoto(imageId);
  }

  // ビデオ関連（デバッグ用）
  onVideoLoaded(): void {
    console.log('Video metadata loaded');
  }

  onVideoError(event: any): void {
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

  // プライベートヘルパーメソッド
  private clearMessages(): void {
    this.errorMessage = '';
    this.extractedText = '';
  }

  private handleError(message: string, error: any): void {
    this.errorMessage = message;
    console.error(message, error);
  }

  private validateSendConditions(): boolean {
    if (this.capturedImages.length !== 1) {
      this.errorMessage = '1枚の写真を撮影してください。';
      return false;
    }

    if (!this.lambdaUrl.trim()) {
      this.errorMessage = 'AWS Lambda関数のURLを入力してください。';
      return false;
    }

    return true;
  }
}
