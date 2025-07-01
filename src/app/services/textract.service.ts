import { Injectable } from '@angular/core';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { environment } from '../../environments/environment';

export interface SerialNumberResult {
    serialNumber: string;
    imageIndex: number;
}

export interface TextractResponse {
    extractedSerialNumbers: SerialNumberResult[];
    allText: string;
    success: boolean;
    error?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TextractService {
    private textractClient: TextractClient | null = null;
    private isConfigured = false;

    constructor() {}

    configureAWS(accessKeyId: string, secretAccessKey: string): void {
    if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS認証情報が必要です');
    }

    this.textractClient = new TextractClient({
        region: environment.aws.region,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    });
    this.isConfigured = true;
    }

    async extractTextFromImages(images: { dataUrl: string }[]): Promise<TextractResponse> {
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
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Textractでテキスト抽出
        const command = new DetectDocumentTextCommand({
            Document: {
                Bytes: binaryData
            }
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
                imageIndex: i
            });
        }
    }

    return {
        extractedSerialNumbers,
        allText,
        success: true
    };

    } catch (error) {
        console.error('Textract処理エラー:', error);
        return {
            extractedSerialNumbers: [],
            allText: '',
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
        };
    }
}

private combineTextBlocks(blocks: any[]): string {
    return blocks
        .filter(block => block.BlockType === 'LINE')
        .map(block => block.Text || '')
        .join('\n');
    }

    private extractSerialNumber(text: string): string | null {
        // シリアル番号のキーワードパターン（英数字とハイフンに対応）
        const patterns = [
            /(?:serial\s*no?\.?|no\.?|number)\s*[:：\-\s]*([a-zA-Z0-9\-]+)/gi
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

    isAWSConfigured(): boolean {
        return this.isConfigured;
    }
}
