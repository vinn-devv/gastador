import fs from "node:fs";
import zlib from "node:zlib";

function parsePNG(filepath) {
  const buf = fs.readFileSync(filepath);
  let pos = 8,
    idats = [],
    width,
    height;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    if (type === "IHDR") {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
    } else if (type === "IDAT")
      idats.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idats));
  const raw = Buffer.alloc(width * height * 4);
  const stride = width * 4;
  let srcPos = 0,
    dstPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    for (let x = 0; x < stride; x++) {
      let b = decompressed[srcPos++];
      let a = x >= 4 ? raw[dstPos - 4] : 0;
      let bPrev = y > 0 ? raw[dstPos - stride] : 0;
      let cPrev = y > 0 && x >= 4 ? raw[dstPos - stride - 4] : 0;
      if (filter === 1) b = (b + a) & 0xff;
      else if (filter === 2) b = (b + bPrev) & 0xff;
      else if (filter === 3) b = (b + Math.floor((a + bPrev) / 2)) & 0xff;
      else if (filter === 4) {
        let p = a + bPrev - cPrev;
        let pa = Math.abs(p - a);
        let pb = Math.abs(p - bPrev);
        let pc = Math.abs(p - cPrev);
        let pr = pa <= pb && pa <= pc ? a : pb <= pc ? bPrev : cPrev;
        b = (b + pr) & 0xff;
      }
      raw[dstPos++] = b;
    }
  }
  return { width, height, raw };
}

function traceLoops(isInside, w, h) {
  const adj = new Map();
  function addEdge(x1, y1, x2, y2) {
    const k = `${x1},${y1}`;
    if (!adj.has(k)) adj.set(k, []);
    adj.get(k).push({ x: x2, y: y2 });
  }

  for (let y = 0; y <= h; y++) {
    for (let x = 0; x <= w; x++) {
      if (y > 0 && y < h && x < w) {
        const top = isInside(x, y - 1);
        const bot = isInside(x, y);
        if (top && !bot) addEdge(x, y, x + 1, y);
        else if (!top && bot) addEdge(x + 1, y, x, y);
      } else if (y === 0 && x < w) {
        if (isInside(x, 0)) addEdge(x + 1, 0, x, 0);
      } else if (y === h && x < w) {
        if (isInside(x, h - 1)) addEdge(x, h, x + 1, h);
      }

      if (x > 0 && x < w && y < h) {
        const left = isInside(x - 1, y);
        const right = isInside(x, y);
        if (left && !right) addEdge(x, y + 1, x, y);
        else if (!left && right) addEdge(x, y, x, y + 1);
      } else if (x === 0 && y < h) {
        if (isInside(0, y)) addEdge(0, y, 0, y + 1);
      } else if (x === w && y < h) {
        if (isInside(w - 1, y)) addEdge(w, y + 1, w, y);
      }
    }
  }

  const loops = [];
  for (const [startK, edges] of adj.entries()) {
    while (edges.length > 0) {
      const first = edges.pop();
      const [sx, sy] = startK.split(",").map(Number);
      const loop = [
        { x: sx, y: sy },
        { x: first.x, y: first.y },
      ];
      let curr = first;
      let guard = 0;
      while ((curr.x !== sx || curr.y !== sy) && guard++ < 100000) {
        const nextList = adj.get(`${curr.x},${curr.y}`);
        if (!nextList || nextList.length === 0) break;
        const next = nextList.pop();
        loop.push(next);
        curr = next;
      }
      if (loop.length > 4 && curr.x === sx && curr.y === sy) {
        loops.push(loop);
      }
    }
  }
  return loops;
}

function simplifyCollinear(loop) {
  if (loop.length <= 3) return loop;
  const res = [loop[0]];
  for (let i = 1; i < loop.length - 1; i++) {
    const prev = res[res.length - 1];
    const curr = loop[i];
    const next = loop[i + 1];
    const dx1 = curr.x - prev.x,
      dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x,
      dy2 = next.y - curr.y;
    if (dx1 * dy2 === dy1 * dx2 && dx1 * dx2 >= 0 && dy1 * dy2 >= 0) continue;
    res.push(curr);
  }
  res.push(loop[loop.length - 1]);
  return res;
}

function loopToPathD(loop) {
  return "M " + loop.map((p) => `${p.x} ${p.y}`).join(" L ") + " Z";
}

const logo = parsePNG("gastador/client/public/gastador-logo.png");
const navyLoops = traceLoops(
  (x, y) => {
    const idx = (y * logo.width + x) * 4;
    return logo.raw[idx + 3] > 80 && logo.raw[idx] < 150;
  },
  logo.width,
  logo.height,
).map(simplifyCollinear);

const whiteLoops = traceLoops(
  (x, y) => {
    const idx = (y * logo.width + x) * 4;
    return logo.raw[idx + 3] > 80 && logo.raw[idx] > 200;
  },
  logo.width,
  logo.height,
).map(simplifyCollinear);

console.log(
  `Logo traced: ${navyLoops.length} navy loops, ${whiteLoops.length} white loops`,
);

const svgLight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 156" fill="none">
  <path fill="#0F2A6B" fill-rule="evenodd" clip-rule="evenodd" d="${navyLoops.map(loopToPathD).join(" ")}" />
  <path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="${whiteLoops.map(loopToPathD).join(" ")}" />
</svg>`;

const svgDark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 156" fill="none">
  <path fill="#0F2A6B" fill-rule="evenodd" clip-rule="evenodd" d="${navyLoops
    .filter((l) => l[0].x < 170)
    .map(loopToPathD)
    .join(" ")}" />
  <path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="${whiteLoops.map(loopToPathD).join(" ")}" />
  <path fill="#F7F9FD" fill-rule="evenodd" clip-rule="evenodd" d="${navyLoops
    .filter((l) => l[0].x >= 170)
    .map(loopToPathD)
    .join(" ")}" />
</svg>`;

fs.writeFileSync("gastador/client/public/gastador-logo.svg", svgLight);
fs.writeFileSync("gastador/client/public/gastador-logo-dark.svg", svgDark);

const icon = parsePNG("gastador/client/public/icon-512.png");
const iconNavy = traceLoops(
  (x, y) => {
    const idx = (y * icon.width + x) * 4;
    return icon.raw[idx + 3] > 80 && icon.raw[idx] < 150;
  },
  icon.width,
  icon.height,
).map(simplifyCollinear);

const iconWhite = traceLoops(
  (x, y) => {
    const idx = (y * icon.width + x) * 4;
    return icon.raw[idx + 3] > 80 && icon.raw[idx] > 200;
  },
  icon.width,
  icon.height,
).map(simplifyCollinear);

console.log(
  `Icon traced: ${iconNavy.length} navy loops, ${iconWhite.length} white loops`,
);

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <path fill="#0F2A6B" fill-rule="evenodd" clip-rule="evenodd" d="${iconNavy.map(loopToPathD).join(" ")}" />
  <path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="${iconWhite.map(loopToPathD).join(" ")}" />
</svg>`;

fs.writeFileSync("gastador/client/public/gastador-mark.svg", svgIcon);
console.log("SVG files generated successfully!");
