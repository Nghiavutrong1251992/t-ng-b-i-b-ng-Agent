// D:\My-small-app\fb-agent-poster\scripts\post.mjs
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.resolve(__dirname, '..', 'fb-profile');

/**
 * Hàm đăng bài tự động lên Facebook bằng Playwright
 * @param {Object} options
 * @param {string} options.targetUrl - URL của Fanpage, Group hoặc trang chủ Facebook
 * @param {string} options.text - Nội dung caption bài đăng
 * @param {string} [options.imagePath] - Đường dẫn file ảnh đính kèm (nếu có)
 */
export async function postToFacebook({ targetUrl = 'https://www.facebook.com/profile.php?id=100091579728365', text, imagePath }) {
  if (!fs.existsSync(userDataDir)) {
    console.error('❌ Chưa tìm thấy thư mục phiên đăng nhập fb-profile!');
    console.log('👉 Vui lòng chạy lệnh: npm run login trước để đăng nhập Facebook lần đầu.');
    return false;
  }

  console.log(`🚀 Đang khởi động trình duyệt tự động...`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Hiển thị cửa sổ trực quan trên màn hình
    slowMo: 100, // Làm chậm từng thao tác một chút để bạn quan sát rõ ràng
    viewport: { width: 1280, height: 850 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  try {
    console.log(`🌐 Đang mở: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Kiểm tra xem trình duyệt đã đăng nhập chưa
    const isLoggedOut = await page.evaluate(() => {
      const body = document.body ? document.body.innerText : '';
      const hasLoginInput = !!document.querySelector('input[name="email"], input[name="pass"]');
      const hasNotAvailableNotice = body.includes('Bạn hiện không xem được nội dung này') || body.includes('This content isn\'t available');
      return hasLoginInput || (hasNotAvailableNotice && (body.includes('Đăng nhập') || body.includes('Log In')));
    });

    if (isLoggedOut) {
      console.error('\n❌ PHÁT HIỆN CHƯA ĐĂNG NHẬP FACEBOOK TRÊN TRÌNH DUYỆT!');
      console.log('👉 Fanpage này ở chế độ quản trị nên yêu cầu bạn phải đăng nhập tài khoản.');
      console.log('👉 Vui lòng chạy lệnh: npm run login');
      console.log('   Sau đó nhập email + mật khẩu tài khoản quản trị trên cửa sổ Chrome vừa mở rồi mới bấm Enter.\n');
      return false;
    }

    // Tự động bấm nút "Chuyển ngay" (Switch now) sang tư cách Fanpage nếu có
    const switchProfileBtn = page.locator('div[role="button"]:has-text("Chuyển ngay"), div[role="button"]:has-text("Switch now"), div[aria-label="Chuyển ngay"], div[aria-label="Switch now"]').first();
    if (await switchProfileBtn.isVisible().catch(() => false)) {
      console.log('🔄 Phát hiện thông báo chuyển sang tư cách Fanpage, đang chuyển...');
      await switchProfileBtn.click();
      await page.waitForTimeout(3000);
    }

    // 1. Tìm ô soạn bài viết (Hỗ trợ cả giao diện tiếng Việt & tiếng Anh)
    console.log('🔍 Đang tìm khung tạo bài viết...');
    const createPostSelectors = [
      'div[role="button"]:has-text("Bạn đang nghĩ gì")',
      'div[role="button"]:has-text("What\'s on your mind")',
      'div[role="button"]:has-text("Viết bài viết")',
      'div[role="button"]:has-text("Tạo bài viết")',
      'div[role="button"]:has-text("Create post")',
      'span:has-text("Bạn đang nghĩ gì")',
      'span:has-text("What\'s on your mind")'
    ];

    let clicked = false;
    for (const sel of createPostSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click();
        clicked = true;
        console.log(`✅ Đã mở khung soạn thảo qua selector: ${sel}`);
        break;
      }
    }

    if (!clicked) {
      console.log('⚠️ Không tìm thấy nút trực tiếp, thử tìm ô input text...');
    }

    await page.waitForTimeout(2000);

    // 2. Nhập nội dung bài viết vào khung soạn thảo
    console.log('✍️ Đang nhập nội dung bài viết...');
    const editor = page.locator('div[role="dialog"] div[role="textbox"][contenteditable="true"], div[role="textbox"][contenteditable="true"]').first();
    await editor.waitFor({ timeout: 15000 });
    await editor.click();
    
    // Facebook Lexical/DraftJS hỗ trợ tốt nhất khi dùng keyboard insertText
    try {
      await page.keyboard.insertText(text);
    } catch {
      await editor.fill(text);
    }
    await page.waitForTimeout(2000);

    // 3. Đính kèm ảnh nếu có
    if (imagePath && fs.existsSync(imagePath)) {
      console.log(`🖼️ Đang chuẩn bị đính kèm ảnh: ${imagePath}`);
      let fileInput = page.locator('input[type="file"][accept*="image"], input[type="file"]').first();
      let hasInput = (await fileInput.count()) > 0;

      if (!hasInput) {
        // Thử bấm nút "Ảnh/video" để mở input file
        const photoBtn = page.locator('div[role="dialog"] div[aria-label="Ảnh/video"], div[role="dialog"] div[aria-label="Photo/video"], div[aria-label="Ảnh/video"], div[aria-label="Photo/video"]').first();
        if (await photoBtn.isVisible().catch(() => false)) {
          await photoBtn.click();
          await page.waitForTimeout(1500);
          fileInput = page.locator('input[type="file"][accept*="image"], input[type="file"]').first();
          hasInput = (await fileInput.count()) > 0;
        }
      }

      if (hasInput) {
        await fileInput.setInputFiles(imagePath);
        console.log('✅ Đã đính kèm ảnh thành công.');
        await page.waitForTimeout(4000); // Đợi Facebook upload và xử lý preview ảnh
      } else {
        console.log('ℹ️ Không tìm thấy nút tải ảnh, bài đăng sẽ hiển thị kèm link xem trước.');
      }
    }

    // 4. Bấm nút Đăng (Post)
    console.log('📢 Đang tìm nút Đăng (Post)...');
    const dialog = page.locator('div[role="dialog"]').first();

    // Tìm chính xác nút Post hoặc Đăng (tránh nhầm với "Add to your post")
    let submitBtn = dialog.locator('div[role="button"][aria-label="Post"], div[role="button"][aria-label="Đăng"], div[role="button"][aria-label="Publish"]').last();
    let found = (await submitBtn.count()) > 0;

    if (!found) {
      submitBtn = dialog.getByRole('button', { name: /^Post$/i, exact: true }).first();
      found = (await submitBtn.count()) > 0;
    }
    if (!found) {
      submitBtn = dialog.getByRole('button', { name: /^Đăng$/i, exact: true }).first();
      found = (await submitBtn.count()) > 0;
    }
    if (!found) {
      submitBtn = dialog.getByRole('button', { name: /^Next$/i, exact: true }).first();
      found = (await submitBtn.count()) > 0;
    }

    await submitBtn.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Chờ nếu nút đang bị disabled (do ảnh đang tải lên server Facebook)
    for (let i = 0; i < 15; i++) {
      const isDisabled = await submitBtn.getAttribute('aria-disabled');
      if (isDisabled !== 'true') break;
      console.log('⏳ Đang đợi ảnh upload xong...');
      await page.waitForTimeout(1000);
    }

    console.log('🎉 Đang bấm nút ĐĂNG bài...');
    try {
      await submitBtn.click({ timeout: 5000 });
    } catch {
      await submitBtn.click({ force: true });
    }

    // Nếu giao diện hiển thị thêm bước Next -> Publish
    await page.waitForTimeout(3000);
    const publishBtn = dialog.locator('div[role="button"][aria-label="Publish"], div[role="button"][aria-label="Đăng"]').first();
    if (await publishBtn.isVisible().catch(() => false)) {
      console.log('📢 Bấm tiếp nút Publish hoàn tất...');
      await publishBtn.click({ force: true });
    }

    // Chờ quá trình upload hoàn tất
    await page.waitForTimeout(8000);
    console.log('✅ Hoàn thành đăng bài thành công!');

  } catch (err) {
    console.error('❌ Lỗi trong quá trình đăng bài:', err.message);
  } finally {
    await context.close();
  }
}

// Nếu chạy trực tiếp file post.mjs qua dòng lệnh:
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sampleText = `🌟 KHÁM PHÁ SA PA & ĐỈNH FANSIPAN HUYỀN THOẠI 🌟\n\n` +
    `Dịch vụ xe riêng đưa đón tận nơi từ Hà Nội đi Sa Pa theo cao tốc CT05 chỉ 5 giờ di chuyển.\n` +
    `Xe 7 - 16 - 28 chỗ VIP hiện đại, tài xế bản địa tận tâm.\n\n` +
    `👉 Chi tiết: https://vntoyoutour.com/car-rental/itineraries/hanoi-sapa/\n` +
    `#VNtoYouTour #Sapa #Fansipan #VietnamTravel #CarRental`;

  await postToFacebook({
    targetUrl: 'https://www.facebook.com',
    text: sampleText
  });
}

