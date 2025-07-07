/**
 * Amplifyビルド時に環境変数をTypeScriptファイルに置換するスクリプト
 * 
 * 使用方法：
 * - Amplifyコンソールで環境変数を設定
 * - ビルド時にnpm run build:prodが実行される
 * - このスクリプトがenvironment.prod.tsの${変数名}を実際の値で置換
 * 
 * 必要な環境変数：
 * - AWS_ACCESS_KEY_ID: AWSアクセスキーID
 * - AWS_SECRET_ACCESS_KEY: AWSシークレットアクセスキー  
 * - AWS_REGION: AWSリージョン（デフォルト: ap-northeast-2）
 */

const fs = require('fs');
const path = require('path');

console.log('環境変数を置換中...');

const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const awsRegion = process.env.AWS_REGION || 'ap-northeast-2';

console.log('AWS_ACCESS_KEY_ID:', awsAccessKeyId ? '設定済み' : '未設定');
console.log('AWS_SECRET_ACCESS_KEY:', awsSecretAccessKey ? '設定済み' : '未設定');
console.log('AWS_REGION:', awsRegion);

const envFilePath = path.join(__dirname, 'src', 'environments', 'environment.prod.ts');

try {
  let content = fs.readFileSync(envFilePath, 'utf8');
  content = content.replace(/\$\{AWS_ACCESS_KEY_ID\}/g, awsAccessKeyId);
  content = content.replace(/\$\{AWS_SECRET_ACCESS_KEY\}/g, awsSecretAccessKey);
  content = content.replace(/\$\{AWS_REGION\}/g, awsRegion);
  fs.writeFileSync(envFilePath, content);
  console.log('環境変数の置換が完了しました。');
} catch (error) {
  console.error('環境変数の置換に失敗しました:', error);
  process.exit(1);
}
