const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const videoPath = 'C:\\Users\\niyat\\Documents\\projects\\flutter projects\\coach\\uploads\\temp\\video-1772985730738-71905185.mp4';
const studentId = '9097fce0-cff3-442c-b31f-864a3c506b6f'; // Jordan Thompson (student profile ID)

console.log('\n' + '='.repeat(70));
console.log('VIDEO UPLOAD TEST - Testing SageMaker Integration');
console.log('='.repeat(70) + '\n');

console.log(`📹 Video file: ${videoPath}`);
console.log(`👤 Student ID: ${studentId}`);
console.log(`🔗 Upload URL: http://localhost:3000/api/video/upload\n`);

// Check if video file exists
if (!fs.existsSync(videoPath)) {
  console.error('❌ Video file not found!');
  console.error(`   Path: ${videoPath}`);
  process.exit(1);
}

const stats = fs.statSync(videoPath);
console.log(`✅ Video file found`);
console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Modified: ${stats.mtime}\n`);

console.log('🚀 Uploading video... (watch server terminal for detailed logs)\n');
console.log('=' .repeat(70));

// Create form data
const form = new FormData();
form.append('video', fs.createReadStream(videoPath));
form.append('studentId', studentId);

// Upload video
axios.post('http://localhost:3000/api/video/upload', form, {
  headers: {
    ...form.getHeaders()
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  timeout: 120000 // 2 minute timeout
})
.then(response => {
  console.log('\n' + '='.repeat(70));
  console.log('✅ ✅ ✅ UPLOAD SUCCESSFUL ✅ ✅ ✅');
  console.log('=' .repeat(70) + '\n');
  console.log('Response:');
  console.log(JSON.stringify(response.data, null, 2));
  console.log('\n' + '='.repeat(70));
  console.log('📊 Check the server terminal above to see:');
  console.log('   - Whether SageMaker was used or mock data');
  console.log('   - Frame extraction details');
  console.log('   - Pose detection success/failure');
  console.log('   - Processing time');
  console.log('='.repeat(70) + '\n');
})
.catch(error => {
  console.log('\n' + '='.repeat(70));
  console.log('❌ ❌ ❌ UPLOAD FAILED ❌ ❌ ❌');
  console.log('='.repeat(70) + '\n');
  
  if (error.response) {
    console.log('Server Response:');
    console.log(`   Status: ${error.response.status}`);
    console.log(`   Status Text: ${error.response.statusText}`);
    console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    console.log('No response from server');
    console.log('   Error:', error.message);
  } else {
    console.log('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Check the server terminal for detailed error logs');
  console.log('='.repeat(70) + '\n');
  
  process.exit(1);
});
