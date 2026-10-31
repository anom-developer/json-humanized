'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
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

function generatePNG(size, primaryColor, accentColor) {
  const width = size;
  const height = size;

  // Raw RGBA scanlines: 1 filter byte (0) + 4 bytes per pixel
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  const radius = size * 0.45;
  const centerX = size / 2;
  const centerY = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded circle background
      if (dist <= radius) {
        // Gradient from cyan to purple
        const t = (x + y) / (width + height);
        const r = Math.round(primaryColor[0] * (1 - t) + accentColor[0] * t);
        const g = Math.round(primaryColor[1] * (1 - t) + accentColor[1] * t);
        const b = Math.round(primaryColor[2] * (1 - t) + accentColor[2] * t);

        // Anti-aliasing at the border
        let a = 255;
        if (dist > radius - 1) {
          a = Math.round(255 * (radius - dist));
        }

        // Inner shape: simple stylized speech bubble / bracket
        const inInnerSquare = Math.abs(dx) < size * 0.22 && Math.abs(dy) < size * 0.18;
        if (inInnerSquare && (Math.abs(dx) > size * 0.12 || Math.abs(dy) > size * 0.10)) {
          // White bracket outline
          rawData[pxOffset]     = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = a;
        } else {
          rawData[pxOffset]     = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = a;
        }
      } else {
        // Transparent
        rawData[pxOffset]     = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8]  = 8; // 8-bit depth
  ihdrData[9]  = 6; // RGBA color type
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(__dirname, '../extension/icons');
fs.mkdirSync(outDir, { recursive: true });

// [0, 229, 255] = #00e5ff (cyan), [123, 97, 255] = purple
[16, 48, 128].forEach(size => {
  const png = generatePNG(size, [0, 229, 255], [123, 97, 255]);
  const filePath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated ${filePath} (${size}x${size}, ${png.length} bytes)`);
});
