export function enhanceContrast(data: Uint8ClampedArray): void {
  const histogram = new Uint32Array(256);
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = data[i + 1] = data[i + 2] = gray;
    histogram[gray]++;
  }
  const clip = Math.max(1, Math.floor(pixels * 0.01));
  let low = 0;
  let high = 255;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += histogram[v];
    if (acc > clip) {
      low = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += histogram[v];
    if (acc > clip) {
      high = v;
      break;
    }
  }
  if (high - low < 24) return;
  const scale = 255 / (high - low);
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.max(0, Math.min(255, Math.round((data[i] - low) * scale)));
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}

export interface Crop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function cropRect(width: number, height: number, crop: Crop, maxSide: number) {
  const sx = (width * crop.left) / 100;
  const sy = (height * crop.top) / 100;
  const sw = Math.max(1, width * (1 - (crop.left + crop.right) / 100));
  const sh = Math.max(1, height * (1 - (crop.top + crop.bottom) / 100));
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  return { sx, sy, sw, sh, outW: Math.max(1, Math.round(sw * scale)), outH: Math.max(1, Math.round(sh * scale)) };
}
