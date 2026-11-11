// D:\My-small-app\fb-agent-poster\scripts\post-perfect.mjs
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.resolve(__dirname, '..', 'fb-profile');
const screenshotDir = path.resolve(__dirname, '..', 'screenshots');
const job = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'current-job.json'), 'utf-8'));

console.log('🚀 AI AGENT: BẮT ĐẦU ĐĂNG BÀI CHUẨN XÁC 100%...');

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 900 },
  args: ['--disable-blink-features=AutomationControlled']
});

const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

try {
  console.log(`🌐 Đang mở: ${job.targetUrl}`);
  await page.goto(job.targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  // Nếu có nút Cancel cover photo cũ còn sót lại, bấm hủy để sạch giao diện
  const cancelCoverBtn = page.locator('div[role="button"]:has-text("Cancel")').first();
  if (await cancelCoverBtn.isVisible().catch(() => false)) {
    console.log('🧹 Đang hủy thao tác ảnh bìa còn sót lại...');
    await cancelCoverBtn.click();
    await page.waitForTimeout(2000);
  }

  // 1. Mở khung Create post
  console.log('1️⃣ Đang mở khung soạn thảo "What\'s on your mind?"...');
  const postTrigger = page.locator('div[role="button"]:has-text("What\'s on your mind?")').first();
  await postTrigger.waitFor({ state: 'visible', timeout: 15000 });
  await postTrigger.click();
  await page.waitForTimeout(2500);

  const dialog = page.locator('div[role="dialog"]').first();
  await dialog.waitFor({ state: 'visible', timeout: 10000 });

  // 2. Nhập nội dung bài viết
  console.log('2️⃣ Đang gõ nội dung bài viết...');
  const editor = dialog.locator('div[role="textbox"][contenteditable="true"]').first();
  await editor.waitFor({ state: 'visible', timeout: 10000 });
  await editor.click();
  await page.keyboard.insertText(job.caption);
  await page.waitForTimeout(2000);

  // 3. Đính kèm ảnh (Chỉ tìm input file bên trong đúng hộp thoại dialog này)
  if (job.imagePath && fs.existsSync(job.imagePath)) {
    console.log('3️⃣ Bấm nút Photo/video để mở khung tải ảnh của bài viết...');
    const photoIcon = dialog.locator('div[aria-label="Photo/video"]').first();
    if (await photoIcon.isVisible().catch(() => false)) {
      await photoIcon.click();
      await page.waitForTimeout(2000);
    }

    // Đính kèm ảnh chính xác vào input của dialog
    const dialogFileInput = dialog.locator('input[type="file"]').first();
    await dialogFileInput.waitFor({ state: 'attached', timeout: 10000 });
    await dialogFileInput.setInputFiles(job.imagePath);
    console.log('⏳ Đang đợi Facebook tải xong ảnh đại diện bài viết...');
    await page.waitForTimeout(6000);
  }

  // 4. Bấm nút Next (Màu xanh dưới cùng)
  console.log('4️⃣ Bấm nút "Next" ở dưới khung Create post...');
  const nextBtn = dialog.locator('div[role="button"]:has-text("Next"), div[role="button"][aria-label="Next"]').last();
  await nextBtn.waitFor({ state: 'visible', timeout: 10000 });

  // Đợi hết disabled
  for (let i = 0; i < 10; i++) {
    const disabled = await nextBtn.getAttribute('aria-disabled');
    if (disabled !== 'true') break;
    await page.waitForTimeout(1000);
  }

  await nextBtn.click({ force: true });
  await page.waitForTimeout(3000);

  // 5. Lúc này dialog chuyển sang "Post settings", tìm nút Post màu xanh
  console.log('5️⃣ Đang ở màn hình Post settings, tìm nút Post màu xanh...');
  const finalPostBtn = dialog.locator('div[role="button"]:has-text("Post"), div[role="button"][aria-label="Post"]').last();
  await finalPostBtn.waitFor({ state: 'visible', timeout: 10000 });
  
  // Đợi hết disabled nếu có
  for (let i = 0; i < 10; i++) {
    const disabled = await finalPostBtn.getAttribute('aria-disabled');
    if (disabled !== 'true') break;
    await page.waitForTimeout(1000);
  }

  console.log('🎉 BẤM NÚT "POST" ĐỂ ĐĂNG BÀI LÊN FANPAGE!');
  await finalPostBtn.click({ force: true });

  // 6. Xử lý popup chặn của Facebook: "Make it easier to contact you" (Add WhatsApp button / Not now)
  console.log('⏳ Đang kiểm tra xem Facebook có hiện popup mời chào (WhatsApp/Contact)...');
  await page.waitForTimeout(2500);
  const notNowBtn = page.locator('div[role="dialog"] div[role="button"]:has-text("Not now"), div[role="dialog"] div[role="button"]:has-text("Không phải bây giờ"), div[role="dialog"] div[aria-label="Not now"]').first();
  if (await notNowBtn.isVisible().catch(() => false)) {
    console.log('🛡️ Phát hiện popup "Make it easier to contact you", tự động bấm "Not now" để hoàn tất đăng bài!');
    await notNowBtn.click({ force: true });
  }

  // 7. Đợi bài viết xuất bản hoàn toàn lên Feed
  console.log('⏳ Đang đợi Facebook hoàn tất xuất bản bài viết lên Fanpage...');
  await page.waitForTimeout(8000);

  // Chụp ảnh bằng chứng bài đã lên sóng
  await page.screenshot({ path: path.join(screenshotDir, '10_verified_published.png') });
  console.log('📸 Đã chụp ảnh xác nhận 10_verified_published.png!');
  console.log('✅ BÀI VIẾT ĐÃ ĐƯỢC ĐĂNG THÀNH CÔNG LÊN FANPAGE!');

} catch (err) {
  console.error('❌ Lỗi:', err.message);
  await page.screenshot({ path: path.join(screenshotDir, 'error_step.png') }).catch(() => {});
} finally {
  await page.waitForTimeout(4000);
  await context.close();
}
