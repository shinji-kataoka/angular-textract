import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

export interface CapturedImage {
  id: number;
  dataUrl: string;
  blob: Blob;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
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
  async startCamera(): Promise<HTMLVideoElement> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // 背面カメラを優先
        },
        audio: false
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

  async setStream(stream: MediaStream): Promise<void> {
    this.stream = stream;
    if (!this.video) {
      this.video = document.createElement('video');
      this.video.autoplay = true;
      this.video.playsInline = true;
    }
    this.video.srcObject = stream;
  }  capturePhoto(videoElement?: HTMLVideoElement): CapturedImage | null {
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
      timestamp: new Date()
    };

    return capturedImage;
  }
  addCapturedImage(image: CapturedImage): void {
    if (this.capturedImages.length < 3) {
      this.capturedImages.push(image);
      this.capturedImagesSubject.next([...this.capturedImages]);
    }
  }

  removeCapturedImage(id: number): void {
    this.capturedImages = this.capturedImages.filter(img => img.id !== id);
    this.capturedImagesSubject.next([...this.capturedImages]);
  }

  getCapturedImages(): CapturedImage[] {
    return [...this.capturedImages];
  }

  clearCapturedImages(): void {
    this.capturedImages = [];
    this.capturedImagesSubject.next([]);
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }
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
