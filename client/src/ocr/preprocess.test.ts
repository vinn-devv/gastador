import { describe, expect, it } from 'vitest';
import { cropRect, enhanceContrast } from './preprocess';

describe('image preparation', () => {
  it('stretches a low-contrast greyscale range', () => {
    const data = new Uint8ClampedArray(400);
    for (let i = 0; i < 100; i++) {
      const v = i < 50 ? 100 : 160;
      data.set([v, v, v, 255], i * 4);
    }
    enhanceContrast(data);
    expect(data[0]).toBe(0);
    expect(data[50 * 4]).toBe(255);
    expect(data[3]).toBe(255);
  });

  it('leaves flat images alone apart from greyscale', () => {
    const data = new Uint8ClampedArray([120, 120, 120, 255, 121, 121, 121, 255]);
    enhanceContrast(data);
    expect([...data]).toEqual([120, 120, 120, 255, 121, 121, 121, 255]);
  });

  it('computes crop rectangles and downsizes large images', () => {
    const r = cropRect(3200, 1600, { top: 10, bottom: 10, left: 0, right: 50 }, 1600);
    expect(r.sy).toBe(160);
    expect(r.sw).toBe(1600);
    expect(r.sh).toBe(1280);
    expect(Math.max(r.outW, r.outH)).toBe(1600);
    const small = cropRect(800, 600, { top: 0, bottom: 0, left: 0, right: 0 }, 1600);
    expect(small.outW).toBe(800);
  });
});
