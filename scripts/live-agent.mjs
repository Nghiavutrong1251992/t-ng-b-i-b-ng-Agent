// D:\My-small-app\fb-agent-poster\scripts\live-agent.mjs
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.resolve(__dirname, '..', 'fb-profile');
const jobFile = path.resolve(__dirname, '..', 'current-job.json');

if (!fs.existsSync(jobFile)) {
  console.error('❌ Không tìm thấy current-job.json');
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(jobFile, 'utf-8'));

console.log('========================================================');
console.log('🤖 AI AGENT: KHỞI ĐỘNG BROWSER TRỰC QUAN TRÊN MÀN HÌNH');
console.log('========================================================');

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: null, // Mở full kích thước màn hình
  args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  slowMo: 60 // Tốc độ vừa phải để bạn quan sát từng thao tác
});

const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

try {
  console.log(`🌐 AI Agent đang mở Fanpage: ${job.targetUrl}`);
  await page.goto(job.targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Tự bấm chuyển tư cách Fanpage nếu có popup
  const switchBtn = page.locator('div[role="button"]:has-text("Switch now"), div[role="button"]:has-text("Chuyển ngay")').first();
  if (await switchBtn.isVisible().catch(() => false)) {
    console.log('🔄 Phát hiện thông báo chuyển sang tư cách Fanpage, AI đang bấm...');
    await switchBtn.click();
    await page.waitForTimeout(3000);
  }

  console.log('🔍 AI Agent đang quét màn hình để tìm khung tạo bài viết...');
  const postBtn = page.locator('div[role="button"]:has-text("What\'s on your mind"), div[role="button"]:has-text("Bạn đang nghĩ gì"), div[role="button"]:has-text("Create post"), div[role="button"]:has-text("Tạo bài viết")').first();
  await postBtn.waitFor({ state: 'visible', timeout: 15000 });

  // Vẽ viền xanh lá làm nổi bật nút AI vừa tìm thấy
  await postBtn.evaluate(el => {
    el.style.outline = '4px solid #00ff55';
    el.style.backgroundColor = 'rgba(0, 255, 85, 0.2)';
  });
  console.log('🎯 Đã tìm thấy nút viết bài (viền màu xanh trên màn hình)! Đang click...');
  await page.waitForTimeout(1500);
  await postBtn.click();
  await page.waitForTimeout(2000);

  console.log('✍️ AI Agent đang định vị ô soạn thảo và tự gõ nội dung...');
  const editor = page.locator('div[role="dialog"] div[role="textbox"][contenteditable="true"]').first();
  await editor.waitFor({ state: 'visible', timeout: 10000 });

  // Viền xanh dương để đánh dấu ô nhập văn bản
  await editor.evaluate(el => {
    el.style.outline = '3px solid #1877f2';
  });
  await editor.click();
  await page.keyboard.insertText(job.caption);
  await page.waitForTimeout(2000);

  // Đính kèm ảnh
  if (job.imagePath && fs.existsSync(job.imagePath)) {
    console.log(`🖼️ AI Agent đang đính kèm ảnh: ${job.imagePath}`);
    let fileInput = page.locator('input[type="file"][accept*="image"]').first();
    if ((await fileInput.count()) === 0) {
      const photoBtn = page.locator('div[role="dialog"] div[aria-label="Photo/video"], div[role="dialog"] div[aria-label="Ảnh/video"]').first();
      if (await photoBtn.isVisible().catch(() => false)) {
        await photoBtn.click();
        await page.waitForTimeout(1500);
        fileInput = page.locator('input[type="file"][accept*="image"]').first();
      }
    }
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(job.imagePath);
      console.log('✅ Đã đính kèm ảnh, đang chờ Facebook nạp preview...');
      await page.waitForTimeout(4000);
    }
  }

  console.log('📢 AI Agent đang tìm nút Đăng bài (Post)...');
  const dialog = page.locator('div[role="dialog"]').first();
  
  // Tìm nút Post / Next / Đăng linh hoạt
  let submitBtn = dialog.locator('div[aria-label="Post"][role="button"], div[aria-label="Đăng"][role="button"], div[aria-label="Next"][role="button"], div[aria-label="Publish"][role="button"]').last();
  let found = (await submitBtn.count()) > 0;

  if (!found) {
    submitBtn = dialog.getByRole('button', { name: /^Post$/i, exact: true }).first();
    found = (await submitBtn.count()) > 0;
  }
  if (!found) {
    submitBtn = dialog.getByRole('button', { name: /^Next$/i, exact: true }).first();
    found = (await submitBtn.count()) > 0;
  }
  if (!found) {
    submitBtn = dialog.getByRole('button', { name: /^Đăng$/i, exact: true }).first();
    found = (await submitBtn.count()) > 0;
  }
  if (!found) {
    // Tìm button ở góc dưới cùng của dialog
    submitBtn = dialog.locator('div[role="button"]').last();
  }

  await submitBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Tô viền đỏ rực để đánh dấu nút Đăng
  await submitBtn.evaluate(el => {
    el.style.outline = '4px solid #ff0055';
    el.style.boxShadow = '0 0 15px #ff0055';
  });
  await page.waitForTimeout(2000);

  console.log('🎉 AI Agent bấm nút ĐĂNG BÀI!');
  try {
    await submitBtn.click({ timeout: 5000 });
  } catch {
    await submitBtn.click({ force: true });
  }

  // Nếu có bước Next -> Publish tiếp theo
  await page.waitForTimeout(3000);
  const publishBtn = dialog.locator('div[role="button"][aria-label="Publish"], div[role="button"][aria-label="Đăng"], div[role="button"]:has-text("Publish")').first();
  if (await publishBtn.isVisible().catch(() => false)) {
    console.log('📢 Bấm tiếp nút Publish hoàn tất...');
    await publishBtn.click({ force: true });
  }

  console.log('========================================================');
  console.log('✅ HOÀN TẤT ĐĂNG BÀI THÀNH CÔNG!');
  console.log('⏱️ Giữ trình duyệt mở 20 giây để bạn ngắm bài viết...');
  console.log('========================================================');
  await page.waitForTimeout(20000);

} catch (err) {
  console.error('❌ Lỗi:', err.message);
} finally {
  await context.close();
}

