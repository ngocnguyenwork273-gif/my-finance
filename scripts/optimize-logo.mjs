// Tối ưu logo: đọc src/assets/app-logo.svg (đang nặng ~1,1 MB vì nhúng ảnh bitmap base64 bên trong)
// rồi xuất ra src/assets/app-logo.png vuông 192x192 (nền trong suốt), thường chỉ vài chục KB.
//
// Cách chạy (một lần):
//   npm i -D sharp
//   node scripts/optimize-logo.mjs
// Sau đó trong src/MainApp.jsx đổi dòng
//   import appLogoAsset from './assets/app-logo.svg';
// thành
//   import appLogoAsset from './assets/app-logo.png';
// và (nếu muốn) xóa file app-logo.svg cũ.
import fs from 'node:fs';
import sharp from 'sharp';

const SRC = process.env.LOGO_SRC || 'src/assets/app-logo.svg';
const OUT = process.env.LOGO_OUT || 'src/assets/app-logo.png';
const SIZE = 192; // logo hiển thị ~40–64px; 192px đủ nét cho màn hình retina

if (!fs.existsSync(SRC)) { console.error(`Không thấy ${SRC}. Chạy lệnh này ở thư mục gốc project.`); process.exit(1); }
const svg = fs.readFileSync(SRC);
const kb = (n) => (n / 1024).toFixed(1) + ' kB';
console.log('SVG gốc :', kb(svg.length));
const embedded = /data:image\/(png|jpe?g|webp)/.test(svg.toString('utf8', 0, Math.min(svg.length, 400000)));
console.log(embedded ? '→ trong SVG có ảnh bitmap nhúng base64 (đây là nguyên nhân nặng).' : '→ SVG vector thuần.');

// Vẽ (rasterize) toàn bộ SVG rồi thu về 192x192, giữ tỉ lệ, nền trong suốt
const info = await sharp(svg, { density: 144 })
  .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
  .toFile(OUT);
console.log(`PNG mới : ${kb(info.size)}  (${info.width}x${info.height})  → ${OUT}`);
console.log(`Giảm    : ${(100 - (info.size / svg.length) * 100).toFixed(1)}%`);
