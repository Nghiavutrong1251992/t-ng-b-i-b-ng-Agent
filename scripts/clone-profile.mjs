// D:\My-small-app\fb-agent-poster\scripts\clone-profile.mjs
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const chromeUserData = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
const localStatePath = path.join(chromeUserData, 'Local State');
const targetProfileDir = path.resolve('fb-profile');
const targetDefaultDir = path.join(targetProfileDir, 'Default');

if (!fs.existsSync(localStatePath)) {
  console.error('❌ Không tìm thấy dữ liệu Google Chrome tại:', chromeUserData);
  process.exit(1);
}

// Đọc danh sách Profile từ Local State
const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
const infoCache = localState.profile?.info_cache || {};

const profileList = Object.entries(infoCache).map(([folderName, info], index) => ({
  index: index + 1,
  folderName,
  name: info.name || 'Không tên',
  email: info.user_name || 'Không có email'
}));

console.log('======================================================');
console.log('📋 DANH SÁCH CÁC PROFILE GOOGLE CHROME TRÊN MÁY TÍNH');
console.log('======================================================');
profileList.forEach(p => {
  console.log(`[${p.index}] Thư mục: ${p.folderName.padEnd(12)} | Tên: ${p.name.padEnd(20)} | Email: ${p.email}`);
});
console.log('------------------------------------------------------');

/**
 * Hàm copy các thư mục và file quan trọng để giữ phiên đăng nhập
 */
function copyProfileSession(sourceFolderName) {
  const sourcePath = path.join(chromeUserData, sourceFolderName);
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Không tìm thấy thư mục profile: ${sourcePath}`);
    return false;
  }

  console.log(`\n⏳ Đang sao chép phiên đăng nhập từ "${sourceFolderName}" sang "fb-profile"...`);

  // Tạo thư mục đích
  if (!fs.existsSync(targetProfileDir)) fs.mkdirSync(targetProfileDir, { recursive: true });
  if (!fs.existsSync(targetDefaultDir)) fs.mkdirSync(targetDefaultDir, { recursive: true });

  // 1. Sao chép Local State để giải mã đúng Cookie
  try {
    fs.copyFileSync(localStatePath, path.join(targetProfileDir, 'Local State'));
  } catch (e) {
    console.warn('⚠️ Cảnh báo copy Local State:', e.message);
  }

  // 2. Danh sách các file & thư mục lưu cookie và phiên đăng nhập
  const itemsToCopy = [
    'Network',
    'Cookies',
    'Cookies-journal',
    'Local Storage',
    'Session Storage',
    'Preferences',
    'Secure Preferences'
  ];

  for (const item of itemsToCopy) {
    const src = path.join(sourcePath, item);
    const dest = path.join(targetDefaultDir, item);
    if (fs.existsSync(src)) {
      try {
        fs.cpSync(src, dest, { recursive: true, force: true });
      } catch (err) {
        // Bỏ qua các file bị lock tạm thời
      }
    }
  }

  // Xóa các file lock của Chrome nếu có
  const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
  for (const lock of lockFiles) {
    const lockPath = path.join(targetProfileDir, lock);
    if (fs.existsSync(lockPath)) {
      try { fs.unlinkSync(lockPath); } catch {}
    }
  }

  console.log('✅ ĐÃ SAO CHÉP PHIÊN ĐĂNG NHẬP THÀNH CÔNG!');
  console.log('👉 Bây giờ bạn có thể chạy: node scripts/agent.mjs vnn425 để đăng bài ngay mà không cần đăng nhập lại!');
  return true;
}

// Kiểm tra tham số dòng lệnh
const arg = process.argv[2];
if (arg) {
  // Tìm theo số thứ tự hoặc tên thư mục
  let selected = profileList.find(p => p.index === parseInt(arg) || p.folderName.toLowerCase() === arg.toLowerCase() || p.name.toLowerCase().includes(arg.toLowerCase()));
  if (selected) {
    copyProfileSession(selected.folderName);
    process.exit(0);
  } else {
    console.log(`⚠️ Không tìm thấy profile khớp với "${arg}".`);
  }
}

// Nếu không truyền tham số, cho người dùng nhập số
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n👉 Nhập số thứ tự [1, 2, ...] hoặc tên Profile cần chọn: ', (answer) => {
  rl.close();
  const trimmed = answer.trim();
  const selected = profileList.find(p => p.index === parseInt(trimmed) || p.folderName.toLowerCase() === trimmed.toLowerCase() || p.name.toLowerCase().includes(trimmed.toLowerCase()));
  if (selected) {
    copyProfileSession(selected.folderName);
  } else {
    console.error('❌ Lựa chọn không hợp lệ.');
  }
  process.exit(0);
});

