// D:\My-small-app\fb-agent-poster\scripts\login.mjs
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.resolve(__dirname, '..', 'fb-profile');

console.log('======================================================');
console.log('🌐 KHỞI ĐỘNG TRÌNH DUYỆT ĐỂ ĐĂNG NHẬP FACEBOOK LẦN ĐẦU');
console.log('======================================================');
console.log(`📁 Profile sẽ được lưu vĩnh viễn tại:\n   ${userDataDir}`);
console.log('------------------------------------------------------');

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 800 },
  args: ['--disable-blink-features=AutomationControlled']
});

const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
await page.goto('https://www.facebook.com');

console.log('👉 Vui lòng đăng nhập Facebook trên cửa sổ trình duyệt vừa mở.');
console.log('👉 Sau khi đăng nhập xong thành công (thấy Newfeed / Trang cá nhân):');
console.log('👉 Quay lại cửa sổ dòng lệnh này và nhấn phím ENTER để hoàn tất lưu phiên.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Kiểm tra xem tài khoản đã đăng nhập thành công chưa bằng cookie c_user
 */
async function checkLoginSuccess() {
  const cookies = await context.cookies();
  const cUser = cookies.find(c => c.name === 'c_user');
  return !!cUser;
}

await new Promise((resolve) => {
  rl.question('Nhấn [ENTER] sau khi đã đăng nhập thành công...', async () => {
    rl.close();
    resolve();
  });
});

const isSuccess = await checkLoginSuccess();
if (isSuccess) {
  console.log('\n🎉 TUYỆT VỜI! Đã phát hiện tài khoản đăng nhập thành công!');
  console.log('✅ Phiên đăng nhập đã được lưu vĩnh viễn vào fb-profile/');
  console.log('👉 Bây giờ bạn có thể chạy: node scripts/agent.mjs vnn425 để đăng bài!');
} else {
  console.warn('\n⚠️ CẢNH BÁO: Trình duyệt chưa thấy bạn đăng nhập tài khoản Facebook!');
  console.warn('👉 Nếu bạn chưa nhập mật khẩu hoặc chưa bấm Đăng nhập, vui lòng chạy lại: npm run login');
}

await context.close();
process.exit(0);

