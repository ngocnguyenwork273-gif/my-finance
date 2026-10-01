/* ==============================================================================
   Chọn, cắt và tải ảnh lên (avatar, ảnh quỹ).
   ============================================================================== */
import { useRef, useState } from 'react';
import ReactCrop from 'react-image-crop';
import { toast, useEscapeKey } from '../feedback';
import { Camera, Loader2 } from '../icons';
import { centeredAspectCrop, downscaleImageFile, parseAspectRatio } from '../lib/image';
import 'react-image-crop/dist/ReactCrop.css';

export function ImageUploader({
  aspectRatio = '1:1',
  circularCrop = false,
  uploading = false,
  onConfirm,
  renderTrigger,
  triggerClassName = 'bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-2.5 text-sm text-blueberry dark:text-white font-semibold cursor-pointer hover:bg-turquoise/10 transition flex items-center gap-2',
  triggerLabel = 'Đổi ảnh',
}) {
  const ratio = parseAspectRatio(aspectRatio);
  const [showEditor, setShowEditor] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 80, aspect: ratio });
  const [zoom, setZoom] = useState(1);
  const imageRef = useRef(null);
  const inputRef = useRef(null);

  async function onSelectFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng 1 file lần sau
    if (!file) return;
    try {
      // Thu nhỏ ảnh trước khi đưa vào editor (tránh canvas quá lớn trên điện thoại)
      const dataUrl = await downscaleImageFile(file);
      setImgSrc(dataUrl);
      setZoom(1);
      // Chưa có khung crop cho tới khi ảnh load xong (xem onImageLoad) — để tránh
      // hiện thoáng qua 1 khung sai kích thước trước khi khung thật xuất hiện.
      setCrop(undefined);
      setShowEditor(true);
    } catch (err) {
      console.error('Không đọc được ảnh:', err);
      toast('Không đọc được ảnh này, thử ảnh khác nhé.');
    }
  }

  // Ảnh vừa load xong trong editor → tự tính & hiển thị ngay khung crop đã canh giữa,
  // khớp đúng tỉ lệ đích (vd khung vuông cho avatar), to gần hết ảnh — người dùng chỉ
  // cần kéo để chọn đúng vùng muốn giữ, không phải tự vẽ khung từ đầu.
  // Lưu ý: khung được lưu ở đơn vị % (không phải px) — vì % luôn khớp tỉ lệ đúng
  // dù người dùng kéo thanh Zoom to/nhỏ ảnh sau đó (px cố định sẽ bị lệch khi ảnh
  // đổi kích thước hiển thị do zoom, khiến khung nhìn như "tự nhiên" sai kích cỡ).
  function onImageLoad(e) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setCrop(centeredAspectCrop(naturalWidth, naturalHeight, ratio));
  }

  useEscapeKey(handleCancel, showEditor && !!imgSrc); // Esc / Back đóng khung cắt ảnh
  function handleCancel() {
    setShowEditor(false);
    setImgSrc(null);
    setZoom(1);
  }

  // Đợi 1 <img> thực sự đã có bitmap sẵn sàng để drawImage() — không chỉ dựa vào 1 tín
  // hiệu duy nhất (complete/onload/decode()), vì trên WebView của bản xuất APK, từng tín
  // hiệu riêng lẻ này có thể báo "xong" sớm hơn thực tế (bitmap GPU chưa kịp sẵn sàng),
  // khiến drawImage() vẽ ra khung trống rồi canvas.toBlob(...,'image/jpeg') xuất thành
  // màu ĐEN đặc (JPEG không có kênh alpha) — đúng hiện tượng "đổi ảnh bìa ra màu đen".
  async function waitForImageReady(image) {
    if (!(image.complete && image.naturalWidth)) {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
    }
    try {
      if (typeof image.decode === 'function') await image.decode();
    } catch {
      // Một số WebView cũ không hỗ trợ đầy đủ decode() — bỏ qua, đã có onload/complete
      // ở trên đảm bảo ảnh sẵn sàng, không cần dừng hẳn vì lỗi này.
    }
    // Đợi thêm 2 khung vẽ (requestAnimationFrame) — khoảng đệm nhỏ để bitmap thực sự
    // được trình duyệt/WebView đẩy lên sẵn sàng cho drawImage(), phòng trường hợp
    // complete/decode() báo xong nhưng khung hình kế tiếp mới thực sự vẽ được.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  // Vẽ vùng đã crop lên canvas theo toạ độ pixel của ẢNH GỐC (naturalWidth/naturalHeight)
  // — không phụ thuộc kích thước đang hiển thị (đã bị zoom to/nhỏ) — rồi trả về canvas đó.
  function drawCroppedCanvas(image) {
    const canvas = document.createElement('canvas');
    const cropX = (crop.x / 100) * image.naturalWidth;
    const cropY = (crop.y / 100) * image.naturalHeight;
    const cropWidth = (crop.width / 100) * image.naturalWidth;
    const cropHeight = (crop.height / 100) * image.naturalHeight;
    // Giới hạn ảnh xuất ra tối đa 1600px cạnh dài (đủ nét cho avatar/banner, upload cũng nhanh hơn)
    const outScale = Math.min(1, 1600 / Math.max(cropWidth, cropHeight));
    canvas.width = Math.max(1, Math.round(cropWidth * outScale));
    canvas.height = Math.max(1, Math.round(cropHeight * outScale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // nền trắng, tránh vùng trống bị JPEG biến thành đen
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  // Kiểm tra canvas vừa vẽ có bị "trống → đen tuyền" hay không, bằng cách lấy mẫu vài
  // điểm ảnh. Nếu drawImage() âm thầm không vẽ được gì thì toàn bộ điểm mẫu sẽ là (0,0,0,0)
  // hoặc (0,0,0,255) — dấu hiệu chắc chắn của đúng lỗi "ảnh bìa xuất ra màu đen".
  function isCanvasLikelyBlank(canvas) {
    try {
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return true;
      const points = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1], [Math.floor(w / 2), Math.floor(h / 2)]];
      return points.every(([x, y]) => {
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        return r === 0 && g === 0 && b === 0;
      });
    } catch {
      return false; // không đọc được pixel (vd canvas bị taint) — bỏ qua, không chặn luồng lưu ảnh
    }
  }

  async function handleConfirm() {
    if (!imageRef.current || !crop || !crop.width || !crop.height) return;
    // Dùng lại thẻ <img> đang hiển thị trong editor để lấy toạ độ crop, nhưng dựng THÊM
    // 1 ảnh MỚI, tải thẳng từ dataURL gốc (imgSrc) để vẽ — vì thẻ <img> trong editor đang
    // bị co giãn bằng CSS (zoom) và có thể là ảnh trình duyệt "tái chế" lại, không đáng tin
    // cậy bằng 1 ảnh mới tinh khi cần đảm bảo bitmap đã thực sự sẵn sàng.
    const freshImage = new window.Image();
    freshImage.src = imgSrc;
    try {
      await waitForImageReady(freshImage);
    } catch (err) {
      console.error('Không thể tải/giải mã ảnh trước khi cắt:', err);
      toast('Không xử lý được ảnh, thử lại nhé.');
      return;
    }
    if (!freshImage.naturalWidth || !freshImage.naturalHeight) { toast('Ảnh bị lỗi, thử ảnh khác nhé.'); return; } // ảnh hỏng/rỗng

    let canvas = drawCroppedCanvas(freshImage);
    if (isCanvasLikelyBlank(canvas)) {
      // Vẽ ra toàn màu đen ngay cả sau khi đã đợi sẵn sàng — thử lại thêm 1 lần sau khi
      // đợi thêm 1 nhịp, thay vì âm thầm xuất ra file đen coi như đã xong.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      canvas = drawCroppedCanvas(freshImage);
      if (isCanvasLikelyBlank(canvas)) {
        console.error('Ảnh xuất ra bị trống/đen sau khi thử lại — huỷ lưu để tránh lưu nhầm ảnh hỏng.');
        toast('Ảnh xuất ra bị lỗi, thử chọn ảnh khác nhé.');
        return;
      }
    }
    canvas.toBlob((blob) => {
      if (!blob) { toast('Không tạo được file ảnh, thử lại nhé.'); return; }
      const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
      onConfirm && onConfirm(file);
      setShowEditor(false);
      setImgSrc(null);
      setZoom(1);
    }, 'image/jpeg', 0.92);
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open: () => inputRef.current?.click(), uploading })
      ) : (
        <label className={triggerClassName}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {uploading ? 'Đang tải...' : triggerLabel}
          <input ref={inputRef} type="file" accept="image/*" onChange={onSelectFile} className="hidden" disabled={uploading} />
        </label>
      )}
      {/* Trigger ẩn để renderTrigger tuỳ biến vẫn dùng chung 1 input file */}
      {renderTrigger && (
        <input ref={inputRef} type="file" accept="image/*" onChange={onSelectFile} className="hidden" disabled={uploading} />
      )}

      {showEditor && imgSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleCancel}>
          <div className="bg-white dark:bg-[#1e1e32] rounded-3xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-blueberry dark:text-white font-bold text-lg mb-3">Cắt ảnh</h3>
            {/* overflow-auto cho phép kéo/pan ảnh khi ảnh lớn hơn khung xem sau khi zoom */}
            <div className="flex items-center justify-center bg-ice-cream dark:bg-night-sky rounded-2xl overflow-auto max-h-[50vh]">
              {/* FIX: react-image-crop gọi onChange(pixelCrop, percentCrop) — tham số ĐẦU là
                  toạ độ theo PIXEL (theo kích thước ảnh đang hiển thị, đã bị zoom), không
                  phải %. Code cũ "onChange={setCrop}" lấy nhầm tham số pixel này, nên mỗi
                  khi người dùng kéo/chỉnh khung bằng tay, "crop" bị ghi đè thành pixel trong
                  khi drawCroppedCanvas() lại tính theo % (crop.x/100 * naturalWidth) — lệch
                  đơn vị khiến vùng cắt chỉ còn đúng 1 góc nhỏ của ảnh gốc. Giờ lấy đúng tham
                  số thứ 2 (percentCrop) để luôn khớp đơn vị % như phần còn lại của component
                  đang giả định. */}
              <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} aspect={ratio} circularCrop={circularCrop} keepSelection disabled={!crop}>
                <img
                  ref={imageRef}
                  src={imgSrc}
                  alt="Crop"
                  className="select-none"
                  style={{ width: `${zoom * 100}%`, maxWidth: 'none', height: 'auto' }}
                  draggable={false}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-xs text-steel dark:text-light-grey font-semibold flex-shrink-0">Zoom</span>
              <input
                type="range" min="1" max="3" step="0.05" value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-turquoise"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleCancel} className="flex-1 py-2.5 rounded-full text-sm font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-[#2a2a44]">Huỷ</button>
              <button onClick={handleConfirm} disabled={!crop} className="flex-1 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-primary shadow-md shadow-turquoise/30 disabled:opacity-60">Lưu ảnh</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
