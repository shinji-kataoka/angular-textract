import { Component, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CameraService, CapturedImage } from './services/camera.service';
import {
  TextractService,
  SerialNumberResult,
  TextractResponse,
} from './services/textract.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  @ViewChild('videoElement', { static: false })
  videoElement!: ElementRef<HTMLVideoElement>;

  // カメラ関連の状態
  isCameraActive = false;
  isCapturing = false;

  // 撮影された画像
  capturedImages: CapturedImage[] = [];
  selectedImage: CapturedImage | null = null;

  // AWS認証情報
  awsAccessKeyId = '';
  awsSecretAccessKey = '';

  // Textract関連
  isProcessing = false;
  extractedText = '';
  extractedSerialNumbers: SerialNumberResult[] = [];
  errorMessage = '';

  // フォーム関連
  selectedSerialNumber = '';
  serialNumberInput = '';

  constructor(
    private cameraService: CameraService,
    private textractService: TextractService
  ) {
    this.cameraService.capturedImages$.subscribe((images) => {
      this.capturedImages = images;
    });

    // 環境変数から認証情報を自動設定
    this.loadAWSCredentialsFromEnvironment();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
  /**
   * カメラを起動し、ビデオストリームを開始する
   * 背面カメラを優先的に使用し、1280x720の解像度で撮影する
   */
  async startCamera(): Promise<void> {
    try {
      this.clearMessages();
      this.isCameraActive = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment',
        },
        audio: false,
      });

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play();
      }

      await this.cameraService.setStream(stream);
    } catch (error) {
      this.handleError(
        'カメラの起動に失敗しました。カメラへのアクセス許可を確認してください。',
        error
      );
      this.isCameraActive = false;
    }
  }

  /**
   * カメラを停止し、撮影された画像をクリアする
   * すべてのメッセージとエラー状態もリセットする
   */
  stopCamera(): void {
    this.cameraService.stopCamera();
    this.cameraService.clearCapturedImages();
    this.clearMessages();
    this.selectedImage = null;
    this.isCameraActive = false;
  }
  /**
   * 写真を撮影し、キャプチャした画像をサービスに追加する
   * 最大3枚まで撮影可能
   */
  capturePhoto(): void {
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

  /**
   * 指定された画像を削除し、再撮影を可能にする
   * @param imageId 削除する画像のID
   */
  retakePhoto(imageId: number): void {
    this.cameraService.removeCapturedImage(imageId);
    this.clearMessages();
  }

  /**
   * すべての撮影画像とメッセージをクリアする
   */
  clearAll(): void {
    this.cameraService.clearCapturedImages();
    this.clearMessages();
  }

  /**
   * Textract処理の条件が満たされているかを確認する
   * @returns boolean 3枚の画像が撮影済みで処理中でない場合true
   */
  canProcessWithTextract(): boolean {
    return this.capturedImages.length === 3 && !this.isProcessing;
  }

  /**
   * AWS Textractを使用して撮影された画像からテキストとシリアル番号を抽出する
   * メインの処理メソッド - UIの「送信」ボタンから呼び出される
   */
  async sendToTextract(): Promise<void> {
    if (!this.validateTextractConditions()) return;

    try {
      this.isProcessing = true;
      this.clearMessages();

      // AWS認証情報を設定
      this.textractService.configureAWS(
        this.awsAccessKeyId,
        this.awsSecretAccessKey
      );

      // Textractでテキスト抽出
      const result: TextractResponse =
        await this.textractService.extractTextFromImages(this.capturedImages);

      if (result.success) {
        this.extractedText = result.allText;
        this.extractedSerialNumbers = result.extractedSerialNumbers;
      } else {
        this.errorMessage = result.error || 'テキスト抽出に失敗しました';
      }
    } catch (error) {
      this.handleError(
        'Textract処理に失敗しました。AWS認証情報やネットワーク接続を確認してください。',
        error
      );
    } finally {
      this.isProcessing = false;
    }
  }

  async processWithTextract(): Promise<void> {
    if (!this.validateTextractConditions()) return;

    try {
      this.isProcessing = true;
      this.clearMessages();

      // AWS認証情報を設定
      this.textractService.configureAWS(
        this.awsAccessKeyId,
        this.awsSecretAccessKey
      );

      // Textractでテキスト抽出
      const result: TextractResponse =
        await this.textractService.extractTextFromImages(this.capturedImages);

      if (result.success) {
        this.extractedText = result.allText;
        this.extractedSerialNumbers = result.extractedSerialNumbers;
      } else {
        this.errorMessage = result.error || 'テキスト抽出に失敗しました';
      }
    } catch (error) {
      this.handleError(
        'Textract処理に失敗しました。AWS認証情報やネットワーク接続を確認してください。',
        error
      );
    } finally {
      this.isProcessing = false;
    }
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
    const states = [
      '未読み込み',
      'メタデータ読み込み中',
      'データ読み込み中',
      '将来データ取得可能',
      '十分なデータ取得済み',
    ];
    return states[video.readyState] || '不明';
  }

  getVideoResolution(): string {
    if (!this.videoElement?.nativeElement) return 'N/A';
    const video = this.videoElement.nativeElement;
    return `${video.videoWidth}x${video.videoHeight}`;
  }

  /**
   * 抽出されたシリアル番号を選択し、フォームに自動入力する
   * @param serialNumber 選択されたシリアル番号
   */
  selectSerialNumber(serialNumber: string): void {
    this.selectedSerialNumber = serialNumber;
    this.serialNumberInput = serialNumber;
  }

  /**
   * フォームの入力内容をクリアする
   */
  clearForm(): void {
    this.serialNumberInput = '';
    this.selectedSerialNumber = '';
  }

  // プライベートヘルパーメソッド
  private clearMessages(): void {
    this.errorMessage = '';
    this.extractedText = '';
    this.extractedSerialNumbers = [];
    this.selectedSerialNumber = '';
  }

  private handleError(message: string, error: any): void {
    this.errorMessage = message;
    console.error(message, error);
  }

  private validateTextractConditions(): boolean {
    if (this.capturedImages.length !== 3) {
      this.errorMessage = '3枚の写真を撮影してください。';
      return false;
    }

    if (!this.awsAccessKeyId.trim()) {
      this.errorMessage =
        'AWS認証情報が設定されていません。環境設定を確認してください。';
      return false;
    }

    if (!this.awsSecretAccessKey.trim()) {
      this.errorMessage =
        'AWS認証情報が設定されていません。環境設定を確認してください。';
      return false;
    }

    return true;
  }

  /**
   * 環境設定ファイルからAWS認証情報を読み込む
   * ローカル開発時はenvironment.tsから、本番時はenvironment.prod.tsから読み込む
   * @private
   */
  private loadAWSCredentialsFromEnvironment(): void {
    // environment.tsから認証情報を読み込み
    if (environment.aws.accessKeyId && environment.aws.secretAccessKey) {
      this.awsAccessKeyId = environment.aws.accessKeyId;
      this.awsSecretAccessKey = environment.aws.secretAccessKey;
      console.log('AWS認証情報が環境設定から読み込まれました');
    } else {
      console.log(
        '環境設定にAWS認証情報が見つかりませんでした。手動で入力してください。'
      );
    }
  }
}
