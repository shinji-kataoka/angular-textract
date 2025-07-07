// ローカル開発用の環境設定ファイル例
// このファイルをコピーして environment.ts を作成し、
// 実際のAWS認証情報を設定してください
export const environment = {
  production: false,
  aws: {
    accessKeyId: 'your_access_key_here',
    secretAccessKey: 'your_secret_key_here',
    region: 'ap-northeast-2'
  }
};
