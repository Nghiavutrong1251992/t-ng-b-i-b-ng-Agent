// D:\My-small-app\fb-agent-poster\scripts\agent.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { postToFacebook } from './post.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// website-vntoyou-ver2 nằm cùng cấp với fb-agent-poster (trong D:\My-small-app)
const websiteDir = path.resolve(__dirname, '..', '..', 'website-vntoyou-ver2');
const tempImgDir = path.resolve(__dirname, '..', 'temp-images');

/**
 * Tải ảnh đại diện của tour về máy để đính kèm vào bài đăng Facebook
 * @param {string} imageUrl 
 * @param {string} tourId 
 * @returns {Promise<string|null>} Đường dẫn file ảnh trên ổ cứng
 */
async function downloadTourImage(imageUrl, tourId) {
  if (!imageUrl) return null;
  try {
    if (!fs.existsSync(tempImgDir)) {
      fs.mkdirSync(tempImgDir, { recursive: true });
    }
    const parsedUrl = new URL(imageUrl);
    const ext = path.extname(parsedUrl.pathname) || '.webp';
    const localFilePath = path.join(tempImgDir, `${tourId}${ext}`);

    if (fs.existsSync(localFilePath)) {
      console.log(`🖼️ Sử dụng ảnh đã lưu tại cache: ${localFilePath}`);
      return localFilePath;
    }

    console.log(`📥 Đang tải ảnh tour từ: ${imageUrl}`);
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(localFilePath, buffer);
    console.log(`✅ Đã lưu ảnh đại diện thành công: ${localFilePath}`);
    return localFilePath;
  } catch (err) {
    console.warn(`⚠️ Không thể tải ảnh đại diện (${err.message}). Sẽ đăng bài kèm link.`);
    return null;
  }
}

/**
 * AI Agent tự động đọc tour từ website và tạo bài viết Facebook
 * @param {string} tourId - Mã tour (ví dụ: 'vnn425', 'vnc301', 'vns401')
 * @param {string} [fanpageUrl] - URL trang Facebook của bạn
 * @param {Object} [options]
 * @param {boolean} [options.previewOnly] - Chỉ xem trước nội dung, không bật trình duyệt đăng
 * @param {boolean} [options.noImage] - Không đính kèm ảnh
 */
export async function autoPostTour(tourId = 'vnn425', fanpageUrl = 'https://www.facebook.com/profile.php?id=100091579728365', options = {}) {
  console.log(`🤖 AI AGENT: Đang phân tích tour "${tourId}" từ website...`);

  const tourFilePath = path.join(websiteDir, 'src', 'content', 'tours', 'en', `${tourId}.json`);
  if (!fs.existsSync(tourFilePath)) {
    console.error(`❌ Không tìm thấy file tour tại: ${tourFilePath}`);
    return;
  }

  const tourData = JSON.parse(fs.readFileSync(tourFilePath, 'utf-8'));
  const title = tourData.title || `Tour Du Lịch ${tourId.toUpperCase()}`;
  const desc = tourData.excerpt || tourData.description || '';
  const duration = typeof tourData.duration === 'object' && tourData.duration?.display 
    ? tourData.duration.display 
    : (tourData.duration || '4 Days / 3 Nights');
  const cities = tourData.routeCities 
    ? tourData.routeCities.map(c => c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' - ') 
    : 'Vietnam';
  const tourUrl = `https://vntoyoutour.com/tours/${tourId}/`;

  // Soạn bài đăng Facebook chuẩn truyền thông
  const fbCaption = 
    `✨ ${title.toUpperCase()} ✨\n\n` +
    `📍 Lộ trình: ${cities}\n` +
    `⏱️ Thời lượng: ${duration}\n\n` +
    `${desc.slice(0, 280)}...\n\n` +
    `💼 Dịch vụ tiêu chuẩn quốc tế: Xe du lịch đời mới, tài xế bản địa tận tâm, hỗ trợ điều phối viên 24/7.\n\n` +
    `🔗 Xem chi tiết lịch trình và báo giá: ${tourUrl}\n\n` +
    `#VNtoYouTour #${tourId.toUpperCase()} #VietnamTravel #PrivateTour #BusinessTravel`;

  console.log('------------------------------------------------------');
  console.log('📝 NỘI DUNG BÀI VIẾT DO AI AGENT TỰ ĐỘNG BIÊN TẬP:');
  console.log(fbCaption);
  console.log('------------------------------------------------------');

  // Xử lý ảnh đính kèm
  let imagePath = null;
  if (!options.noImage && tourData.image?.url) {
    imagePath = await downloadTourImage(tourData.image.url, tourId);
  }

  if (options.previewOnly) {
    console.log('👀 [CHẾ ĐỘ XEM TRƯỚC]: Không thực hiện đăng lên Facebook.');
    return;
  }

  // Gọi hàm đăng bài
  await postToFacebook({
    targetUrl: fanpageUrl,
    text: fbCaption,
    imagePath
  });
}

// Chạy trực tiếp qua dòng lệnh: node scripts/agent.mjs [tourId] [fanpageUrl] [--preview] [--no-image]
const args = process.argv.slice(2);
const isPreview = args.includes('--preview');
const noImage = args.includes('--no-image');
const cleanArgs = args.filter(a => !a.startsWith('--'));

const tourId = cleanArgs[0] || 'vnn425';
// Mặc định sử dụng Fanpage VN To You Tour của bạn
const defaultFanpageUrl = 'https://www.facebook.com/profile.php?id=100091579728365';
const targetUrl = cleanArgs[1] || defaultFanpageUrl;

await autoPostTour(tourId, targetUrl, { previewOnly: isPreview, noImage });

