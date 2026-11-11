// D:\My-small-app\fb-agent-poster\scripts\diagnose-page.mjs
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.resolve(__dirname, '..', 'fb-profile');
const screenshotDir = path.resolve(__dirname, '..', 'screenshots');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

console.log('🔍 Đang mở trình duyệt để chụp ảnh chẩn đoán giao diện Facebook...');
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 900 },
  args: ['--disable-blink-features=AutomationControlled']
});

const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

try {
  const targetUrl = 'https://www.facebook.com/profile.php?id=100091579728365';
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: path.join(screenshotDir, '01_fanpage_initial.png') });
  console.log('📸 Đã chụp ảnh 01: Giao diện Fanpage khi vừa vào');

  // Lấy thông tin tài khoản hiện tại & các nút trên trang
  const pageState = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const buttons = Array.from(document.querySelectorAll('div[role="button"], button')).map(b => ({
      text: b.innerText ? b.innerText.trim().slice(0, 50) : '',
      ariaLabel: b.getAttribute('aria-label') || ''
    })).filter(b => b.text || b.ariaLabel);

    return {
      title: document.title,
      hasSwitchNow: text.includes('Chuyển ngay') || text.includes('Switch now'),
      hasCreatePost: text.includes('Bạn đang nghĩ gì') || text.includes("What's on your mind") || text.includes('Tạo bài viết') || text.includes('Create post'),
      buttons: buttons.slice(0, 30)
    };
  });

  console.log('📊 Trạng thái trang:', JSON.stringify(pageState, null, 2));

  // Thử tìm nút soạn bài và click
  const postBtn = page.locator('div[role="button"]:has-text("What\'s on your mind"), div[role="button"]:has-text("Bạn đang nghĩ gì"), div[role="button"]:has-text("Create post"), div[role="button"]:has-text("Tạo bài viết")').first();
  if (await postBtn.isVisible().catch(() => false)) {
    console.log('🎯 Thấy nút tạo bài viết, đang click thử...');
    await postBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, '02_composer_opened.png') });
    console.log('📸 Đã chụp ảnh 02: Khung soạn thảo vừa mở');
  } else {
    console.log('⚠️ Không thấy nút tạo bài viết trực tiếp.');
  }

} catch (err) {
  console.error('❌ Lỗi:', err.message);
} finally {
  await page.waitForTimeout(5000);
  await context.close();
}

