// D:\My-small-app\fb-agent-poster\scripts\publish.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { postToFacebook } from './post.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jobFile = path.resolve(__dirname, '..', 'current-job.json');

if (!fs.existsSync(jobFile)) {
  console.error('❌ Không tìm thấy file current-job.json chứa dữ liệu bài đăng do AI tạo!');
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(jobFile, 'utf-8'));
console.log('🤖 Đang nhận lệnh từ AI Agent (Antigravity) để đăng bài...');
console.log(`📌 Tiêu đề/Nội dung: \n${job.caption.slice(0, 150)}...\n`);
if (job.imagePath) {
  console.log(`🖼️ Đính kèm ảnh: ${job.imagePath}`);
}

await postToFacebook({
  targetUrl: job.targetUrl || 'https://www.facebook.com/profile.php?id=100091579728365',
  text: job.caption,
  imagePath: job.imagePath
});

