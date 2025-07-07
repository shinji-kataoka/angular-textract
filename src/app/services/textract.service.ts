import { Injectable } from '@angular/core';
import {
  TextractClient,
  DetectDocumentTextCommand,
} from '@aws-sdk/client-textract';
import { environment } from '../../environments/environment';

/**
 * シリアル番号の抽出結果を表すインターフェース
 */
export interface SerialNumberResult {
  serialNumber: string;
  imageIndex: number;
}

/**
 * Textract処理の結果を表すインターフェース
 */
export interface TextractResponse {
  extractedSerialNumbers: SerialNumberResult[];
  allText: string;
  success: boolean;
  error?: string;
}

/**
 * AWS Textractを使用してOCR処理を行うサービス
 * 画像からテキストを抽出し、シリアル番号を特定する
 */
@Injectable({
  providedIn: 'root',
})
export class TextractService {
  private textractClient: TextractClient | null = null;
  private isConfigured = false;

  constructor() {}

  /**
   * AWS認証情報を設定し、TextractClientを初期化する
   * @param accessKeyId AWSアクセスキーID
   * @param secretAccessKey AWSシークレットアクセスキー
   * @throws 認証情報が空の場合
   */
  configureAWS(accessKeyId: string, secretAccessKey: string): void {
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS認証情報が必要です');
    }

    this.textractClient = new TextractClient({
      region: environment.aws.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.isConfigured = true;
  }

  /**
   * 複数の画像からテキストを抽出し、シリアル番号を検出する
   * @param images 処理する画像のデータURL配列
   * @returns Promise<TextractResponse> 抽出結果とシリアル番号の配列
   * @throws AWS認証情報が設定されていない場合
   */
  async extractTextFromImages(
    images: { dataUrl: string }[]
  ): Promise<TextractResponse> {
    if (!this.isConfigured || !this.textractClient) {
      throw new Error('AWS認証情報が設定されていません');
    }

    try {
      const extractedSerialNumbers: SerialNumberResult[] = [];
      let allText = '';

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // DataURLからバイナリデータを取得
        const base64Data = image.dataUrl.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), (c) =>
          c.charCodeAt(0)
        );

        // Textractでテキスト抽出
        const command = new DetectDocumentTextCommand({
          Document: {
            Bytes: binaryData,
          },
        });

        const response = await this.textractClient.send(command);

        // テキストを結合
        const imageText = this.combineTextBlocks(response.Blocks || []);
        allText += `=== 画像 ${i + 1} ===\n${imageText}\n\n`;

        // シリアル番号を抽出
        const serialNumber = this.extractSerialNumber(imageText);
        if (serialNumber) {
          extractedSerialNumbers.push({
            serialNumber: serialNumber,
            imageIndex: i,
          });
        }
      }

      return {
        extractedSerialNumbers,
        allText,
        success: true,
      };
    } catch (error) {
      console.error('Textract処理エラー:', error);
      return {
        extractedSerialNumbers: [],
        allText: '',
        success: false,
        error:
          error instanceof Error ? error.message : '不明なエラーが発生しました',
      };
    }
  }

  /**
   * Textractから返されたブロックを結合してテキストを生成する
   * @param blocks TextractのBlocks配列
   * @returns string 結合されたテキスト
   * @private
   */
  private combineTextBlocks(blocks: any[]): string {
    return blocks
      .filter((block) => block.BlockType === 'LINE')
      .map((block) => block.Text || '')
      .join('\n');
  }

  /**
   * テキストからシリアル番号を抽出する
   * キーワード: Serial No., Serial No, serial no, serial n, No., No, no, Number, number
   * @param text 検索対象のテキスト
   * @returns string | null 見つかったシリアル番号、見つからない場合はnull
   * @private
   */
  private extractSerialNumber(text: string): string | null {
    // シリアル番号のキーワードパターン（英数字とハイフンに対応）
    const patterns = [
      /(?:serial\s*no?\.?|no\.?|number)\s*[:：\-\s]*([a-zA-Z0-9\-]+)/gi,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        // 最初に見つかったシリアル番号を返す
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * AWS認証情報が設定されているかを確認する
   * @returns boolean 設定されている場合true
   */
  isAWSConfigured(): boolean {
    return this.isConfigured;
  }
}
