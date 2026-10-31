'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.slice(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function renderSpeakingIcon(size) {
  const width = size;
  const height = size;
  const scale = size / 128;

  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  // Background gradient: dark sleek cyber theme with vibrant cyan
  const bgRadius = size * 0.46;
  const cx = size / 2;
  const cy = size / 2;

  // Key coordinates scaled
  const headCx = 46 * scale;
  const headCy = 42 * scale;
  const headR  = 19 * scale;

  const mouthX = 58 * scale;
  const mouthY = 48 * scale;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter 0

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const dx = x - cx;
      const dy = y - cy;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      // Outside main circle
      if (distFromCenter > bgRadius) {
        rawData[pxOffset]     = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Base background gradient: Deep navy/purple (#101426) to dark cyan (#082032)
      let t = (x + y) / (width + height);
      let bgR = Math.round(14 * (1 - t) + 8 * t);
      let bgG = Math.round(20 * (1 - t) + 40 * t);
      let bgB = Math.round(45 * (1 - t) + 65 * t);
      let alpha = 255;

      if (distFromCenter > bgRadius - 1) {
        alpha = Math.round(255 * (bgRadius - distFromCenter));
      }

      // Check if pixel belongs to Speaking Person:
      let isPerson = false;
      let isWave = false;

      // 1. Head (circle)
      const distHead = Math.hypot(x - headCx, y - headCy);
      if (distHead <= headR) {
        isPerson = true;
      }

      // 2. Neck & Shoulders (bust profile)
      // Neck:
      if (x >= 38 * scale && x <= 54 * scale && y >= 56 * scale && y <= 72 * scale) {
        isPerson = true;
      }
      // Shoulders / bust:
      const shoulderDx = (x - 44 * scale) / (32 * scale);
      const shoulderDy = (y - 94 * scale) / (24 * scale);
      if (shoulderDx * shoulderDx + shoulderDy * shoulderDy <= 1 && y >= 68 * scale) {
        isPerson = true;
      }

      // 3. Sound / speech waves emanating from mouth to the right
      const waveDx = x - mouthX;
      const waveDy = y - mouthY;
      const waveDist = Math.hypot(waveDx, waveDy);
      const waveAngle = Math.atan2(waveDy, waveDx) * (180 / Math.PI); // -180 to 180

      if (waveDx > 0 && Math.abs(waveAngle) <= 45) {
        // Wave 1: radius ~15
        const w1 = Math.abs(waveDist - 16 * scale);
        // Wave 2: radius ~27
        const w2 = Math.abs(waveDist - 28 * scale);
        // Wave 3: radius ~40
        const w3 = Math.abs(waveDist - 40 * scale);

        const strokeWidth = Math.max(1, 2.5 * scale);
        if (w1 <= strokeWidth && Math.abs(waveAngle) <= 35) isWave = true;
        if (w2 <= strokeWidth && Math.abs(waveAngle) <= 40) isWave = true;
        if (w3 <= strokeWidth && Math.abs(waveAngle) <= 45) isWave = true;
      }

      if (isPerson) {
        // Bright white/cyan for head & person
        rawData[pxOffset]     = 240;
        rawData[pxOffset + 1] = 250;
        rawData[pxOffset + 2] = 255;
        rawData[pxOffset + 3] = alpha;
      } else if (isWave) {
        // Electric Cyan for speech waves (#00e5ff)
        rawData[pxOffset]     = 0;
        rawData[pxOffset + 1] = 229;
        rawData[pxOffset + 2] = 255;
        rawData[pxOffset + 3] = alpha;
      } else {
        rawData[pxOffset]     = bgR;
        rawData[pxOffset + 1] = bgG;
        rawData[pxOffset + 2] = bgB;
        rawData[pxOffset + 3] = alpha;
      }
    }
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8]  = 8; // 8-bit depth
  ihdrData[9]  = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(__dirname, '../extension/icons');
fs.mkdirSync(outDir, { recursive: true });

[16, 48, 128].forEach(size => {
  const png = renderSpeakingIcon(size);
  const p = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(p, png);
  console.log(`Rendered speaking person icon: ${p} (${size}x${size})`);
});

