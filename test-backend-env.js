// Test script to load env from src/backend/.env like the server does
const dotenv = require('dotenv');
const path = require('path');

// Load from src/backend/.env
dotenv.config({ path: path.join(__dirname, 'src', 'backend', '.env') });

console.log('\n' + '='.repeat(70));
console.log('TESTING ENV LOADING FROM src/backend/.env');
console.log('='.repeat(70) + '\n');

console.log('📋 Environment Variables Loaded:');
console.log(`   USE_SAGEMAKER_POSE_DETECTION: ${process.env.USE_SAGEMAKER_POSE_DETECTION || 'NOT SET'}`);
console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'SET (' + process.env.AWS_ACCESS_KEY_ID.substring(0,8) + '...)' : 'NOT SET'}`);
console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'SET (hidden)' : 'NOT SET'}`);
console.log(`   SAGEMAKER_ENDPOINT_NAME: ${process.env.SAGEMAKER_ENDPOINT_NAME || 'NOT SET'}`);
console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
console.log(`   VIDEO_STORAGE_PROVIDER: ${process.env.VIDEO_STORAGE_PROVIDER || 'NOT SET'}`);
console.log(`   AZURE_OPENAI_API_KEY: ${process.env.AZURE_OPENAI_API_KEY ? 'SET (8AJHNEO...)' : 'NOT SET'}`);

console.log('\n' + '='.repeat(70));
console.log('🔍 Analysis:');
console.log('='.repeat(70));

// Check SageMaker configuration
const useSageMaker = process.env.USE_SAGEMAKER_POSE_DETECTION === 'true';
const hasAwsCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.SAGEMAKER_ENDPOINT_NAME);

console.log(`\n1. SageMaker Enabled Flag: ${useSageMaker ? '✅ YES' : '❌ NO'}`);
console.log(`   (USE_SAGEMAKER_POSE_DETECTION === 'true' ? ${useSageMaker})`);

console.log(`\n2. AWS Credentials Configured: ${hasAwsCredentials ? '✅ YES' : '❌ NO'}`);
console.log(`   (AWS_ACCESS_KEY_ID && SAGEMAKER_ENDPOINT_NAME both exist)`);

console.log('\n' + '='.repeat(70));
console.log('📊 RESULT:');
console.log('='.repeat(70));

if (useSageMaker && hasAwsCredentials) {
  console.log('\n✅ ✅ ✅ SAGEMAKER WILL BE USED ✅ ✅ ✅');
  console.log('\n   Video frames will be sent to AWS SageMaker endpoint');
  console.log(`   Endpoint: ${process.env.SAGEMAKER_ENDPOINT_NAME}`);
  console.log(`   Region: ${process.env.AWS_REGION}`);
} else if (useSageMaker && !hasAwsCredentials) {
  console.log('\n⚠️  SAGEMAKER ENABLED but CREDENTIALS MISSING');
  console.log('   ❌ MOCK DATA WILL BE USED instead');
} else {
  console.log('\n❌ MOCK DATA WILL BE USED');
  console.log('   (SageMaker not enabled)');
}

console.log('\n' + '='.repeat(70) + '\n');
