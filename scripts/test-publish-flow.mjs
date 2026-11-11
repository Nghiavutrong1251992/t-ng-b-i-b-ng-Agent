// D:\My-small-app\fb-agent-poster\scripts\test-publish-flow.mjs
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.resolve(__dirname, '..', 'fb-profile');
const screenshotDir = path.resolve(__dirname, '..', 'screenshots');
const job = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'current-job.json'), 'utf-8'));

console.log('🚀 Bắt đầu quy trình đăng bài chính xác từng bước...');

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 900 },
  args: ['--disable-blink-features=AutomationControlled']
});

const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

try {
  await page.goto(job.targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  // 1. Mở khung Create post
  console.log('1️⃣ Mở khung Tạo bài viết (What\'s on your mind?)...');
  const postTrigger = page.locator('div[role="button"]:has-text("What\'s on your mind?")').first();
  await postTrigger.click();
  await page.waitForTimeout(2500);

  // 2. Nhập nội dung
  console.log('2️⃣ Nhập nội dung bài viết...');
  const editor = page.locator('div[role="dialog"] div[role="textbox"][contenteditable="true"]').first();
  await editor.waitFor({ state: 'visible', timeout: 10000 });
  await editor.click();
  await page.keyboard.insertText(job.caption);
  await page.waitForTimeout(2000);

  // 3. Đính kèm ảnh qua nút Photo/video
  console.log('3️⃣ Đính kèm ảnh...');
  const photoBtn = page.locator('div[role="dialog"] div[aria-label="Photo/video"]').first();
  if (await photoBtn.isVisible().catch(() => false)) {
    await photoBtn.click();
    await page.waitForTimeout(1500);
  }

  const fileInput = page.locator('div[role="dialog"] input[type="file"][accept*="image"], input[type="file"]').first();
  await fileInput.setInputFiles(job.imagePath);
  console.log('⏳ Đợi Facebook tải xong preview ảnh (6 giây)...');
  await page.waitForTimeout(6000);

  await page.screenshot({ path: path.join(screenshotDir, '03_content_and_image_ready.png') });
  console.log('📸 Đã chụp ảnh 03: Đã điền xong nội dung và ảnh');

  // 4. Bấm nút NEXT (Tiếp tục)
  console.log('4️⃣ Tìm và bấm nút NEXT...');
  const dialog = page.locator('div[role="dialog"]').first();
  const nextBtn = dialog.locator('div[role="button"][aria-label="Next"], div[role="button"]:has-text("Next")').last();
  await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
  
  // Đợi nút Next hết trạng thái disabled
  for (let i = 0; i < 10; i++) {
    const disabled = await nextBtn.getAttribute('aria-disabled');
    if (disabled !== 'true') break;
    console.log('⏳ Đang chờ nút Next sẵn sàng...');
    await page.waitForTimeout(1000);
  }

  await nextBtn.click({ force: true });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(screenshotDir, '04_after_next_step.png') });
  console.log('📸 Đã chụp ảnh 04: Giao diện sau khi bấm Next');

  // 5. Bấm nút PUBLISH / POST cuối cùng
  console.log('5️⃣ Tìm và bấm nút PUBLISH / POST...');
  const publishBtn = page.locator('div[role="dialog"] div[role="button"][aria-label="Publish"], div[role="dialog"] div[role="button"]:has-text("Publish"), div[role="dialog"] div[role="button"][aria-label="Post"], div[role="dialog"] div[role="button"]:has-text("Post")').last();
  await publishBtn.waitFor({ state: 'visible', timeout: 10000 });
  await publishBtn.click({ force: true });
  console.log('🎉 ĐÃ BẤM NÚT PUBLISH THÀNH CÔNG!');

  // Đợi Facebook tải và đóng dialog
  await page.waitForTimeout(10000);
  await page.screenshot({ path: path.join(screenshotDir, '05_final_published.png') });
  console.log('📸 Đã chụp ảnh 05: Kết quả sau khi Publish');

} catch (err) {
  console.error('❌ Lỗi:', err.message);
  await page.screenshot({ path: path.join(screenshotDir, 'error_state.png') }).catch(() => {});
} finally {
  await context.close();
}

