import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

/**
 * 撮影された画像の情報を管理するインターフェース
 */
export interface CapturedImage {
  id: number;
  dataUrl: string;
  blob: Blob;
  timestamp: Date;
}

/**
 * カメラ操作とキャプチャ画像管理を行うサービス
 * 最大3枚の画像を撮影・管理し、AWS Textractでの処理に適した形式で提供する
 */
@Injectable({
  providedIn: 'root',
})
export class CameraService {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private capturedImages: CapturedImage[] = [];
  private capturedImagesSubject = new BehaviorSubject<CapturedImage[]>([]);

  public capturedImages$ = this.capturedImagesSubject.asObservable();

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  /**
   * カメラを起動し、映像ストリームを取得する
   * @returns Promise<HTMLVideoElement> 映像が表示されるvideoエレメント
   * @throws カメラアクセスに失敗した場合
   */
  async startCamera(): Promise<HTMLVideoElement> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // 背面カメラを優先
        },
        audio: false,
      });

      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.playsInline = true;

      return new Promise((resolve, reject) => {
        this.video!.onloadedmetadata = () => {
          resolve(this.video!);
        };
        this.video!.onerror = reject;
      });
    } catch (error) {
      console.error('カメラの起動に失敗しました:', error);
      throw error;
    }
  }

  /**
   * 既存のメディアストリームを設定する（コンポーネントから渡される場合）
   * @param stream 設定するメディアストリーム
   */
  async setStream(stream: MediaStream): Promise<void> {
    this.stream = stream;
    if (!this.video) {
      this.video = document.createElement('video');
      this.video.autoplay = true;
      this.video.playsInline = true;
    }
    this.video.srcObject = stream;
  }
  /**
   * 現在のビデオフレームを撮影し、CapturedImageオブジェクトを作成する
   * @param videoElement 撮影するビデオエレメント（未指定の場合は内部のvideoを使用）
   * @returns CapturedImage | null 撮影された画像データ、失敗時はnull
   */
  capturePhoto(videoElement?: HTMLVideoElement): CapturedImage | null {
    const video = videoElement || this.video;

    if (!video || !this.canvas) {
      console.error('カメラまたはキャンバスが初期化されていません');
      return null;
    }

    // ビデオが再生中でない場合はエラー
    if (video.readyState !== 4) {
      console.error('ビデオが準備できていません');
      return null;
    }

    const context = this.canvas.getContext('2d');
    if (!context) {
      console.error('キャンバスコンテキストを取得できません');
      return null;
    }

    // キャンバスのサイズをビデオに合わせる
    this.canvas.width = video.videoWidth || video.clientWidth;
    this.canvas.height = video.videoHeight || video.clientHeight;

    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

    // データURLを取得
    const dataUrl = this.canvas.toDataURL('image/jpeg', 0.8);

    // Blobを同期的に取得するためにcanvasのtoBlobの代わりにdataURLからblobを作成
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });

    const capturedImage: CapturedImage = {
      id: Date.now(),
      dataUrl: dataUrl,
      blob: blob,
      timestamp: new Date(),
    };

    return capturedImage;
  }
  /**
   * 撮影された画像を配列に追加する（最大3枚まで）
   * @param image 追加する画像データ
   */
  addCapturedImage(image: CapturedImage): void {
    if (this.capturedImages.length < 3) {
      this.capturedImages.push(image);
      this.capturedImagesSubject.next([...this.capturedImages]);
    }
  }

  /**
   * 指定されたIDの画像を削除する
   * @param id 削除する画像のID
   */
  removeCapturedImage(id: number): void {
    this.capturedImages = this.capturedImages.filter((img) => img.id !== id);
    this.capturedImagesSubject.next([...this.capturedImages]);
  }

  /**
   * 撮影された画像のコピーを取得する
   * @returns CapturedImage[] 撮影された画像の配列
   */
  getCapturedImages(): CapturedImage[] {
    return [...this.capturedImages];
  }

  /**
   * 撮影された画像をすべて削除する
   */
  clearCapturedImages(): void {
    this.capturedImages = [];
    this.capturedImagesSubject.next([]);
  }

  /**
   * カメラを停止し、リソースを解放する
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }
  /**
   * 撮影された画像をLambda関数に送信する（レガシー機能）
   * @param lambdaUrl 送信先のLambda関数URL
   * @returns Promise<any> Lambda関数からのレスポンス
   * @throws 3枚の画像が撮影されていない場合、または送信に失敗した場合
   */
  async sendImagesToLambda(lambdaUrl: string): Promise<any> {
    if (this.capturedImages.length !== 3) {
      throw new Error('3枚の写真が必要です');
    }

    const formData = new FormData();
    this.capturedImages.forEach((image, index) => {
      formData.append(`image${index + 1}`, image.blob, `photo${index + 1}.jpg`);
    });

    try {
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('送信に失敗しました:', error);
      throw error;
    }
  }
}
