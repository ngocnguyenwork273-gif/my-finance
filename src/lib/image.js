/* ==============================================================================
   Xử lý ảnh phía trình duyệt (thu nhỏ, kiểm tra canvas rỗng, cắt theo tỉ lệ) — dùng cho upload ảnh.
   ============================================================================== */
import { centerCrop, makeAspectCrop } from 'react-image-crop';

export function parseAspectRatio(aspectRatio) {
  if (typeof aspectRatio === 'number') return aspectRatio;
  const [w, h] = String(aspectRatio || '1:1').split(':').map(Number);
  if (!w || !h) return 1;
  return w / h;
}

// Tự động tính khung crop được canh giữa, khớp đúng tỉ lệ đích (vd 1:1 cho avatar)
// dựa trên kích thước THẬT của ảnh vừa tải lên — để khung crop hiện ra sẵn đúng
// hình dạng mong muốn NGAY khi ảnh load xong, trước khi người dùng kéo/chỉnh tay.
export function centeredAspectCrop(mediaWidth, mediaHeight, ratio) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, ratio, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

// Tải 1 <img> từ src và đợi cho tới khi bitmap THỰC SỰ sẵn sàng (onload + decode + 2 khung vẽ).
function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = async () => {
      try { if (typeof img.decode === 'function') await img.decode(); } catch { /* WebView cũ: bỏ qua */ }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

// Canvas có thật sự được vẽ chưa? Canvas chưa vẽ gì thì mọi điểm ảnh có alpha = 0.
function canvasHasPixels(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    for (const fx of [0.1, 0.5, 0.9]) {
      for (const fy of [0.1, 0.5, 0.9]) {
        if (ctx.getImageData(Math.floor(w * fx), Math.floor(h * fy), 1, 1).data[3] > 0) return true;
      }
    }
    return false;
  } catch {
    return true; // không đọc được pixel → coi như ổn, không chặn luồng
  }
}

// Thu nhỏ ảnh gốc từ điện thoại (thường 12-48MP) xuống tối đa maxSide px cạnh dài.
// Canvas trên mobile/WebView bị giới hạn kích thước → ảnh quá lớn sẽ vẽ ra đen/trắng.
// Thử lần lượt: (1) createImageBitmap  (2) <img> + canvas  (3) dùng thẳng blob URL không thu nhỏ.
// Luôn trả về 1 src dùng được cho <img> — KHÔNG bao giờ trả về ảnh trắng/trống.
export async function downscaleImageFile(file, maxSide = 2048) {
  function drawTo(source, sw, sh) {
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (!canvasHasPixels(canvas)) return null; // drawImage âm thầm không vẽ được gì
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#fff'; // ảnh PNG trong suốt → nền trắng (JPEG không có alpha)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL('image/jpeg', 0.9);
    return out && out.startsWith('data:image') ? out : null;
  }

  // Cách 1: createImageBitmap — ổn định hơn <img> trên nhiều WebView
  try {
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(file);
      try {
        const out = drawTo(bmp, bmp.width, bmp.height);
        if (out) return out;
      } finally {
        if (bmp.close) bmp.close();
      }
    }
  } catch (err) {
    console.warn('createImageBitmap thất bại, thử cách khác:', err);
  }

  // Cách 2: <img> từ blob URL rồi vẽ lên canvas
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    if (img.naturalWidth && img.naturalHeight) {
      const out = drawTo(img, img.naturalWidth, img.naturalHeight);
      if (out) { URL.revokeObjectURL(url); return out; }
    }
  } catch (err) {
    console.warn('Tải ảnh qua <img> thất bại:', err);
  }

  // Cách 3: dùng thẳng blob URL (không thu nhỏ) — vẫn hơn là ảnh trắng
  return url;
}
