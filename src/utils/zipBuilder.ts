/**
 * Zero-dependency PKZIP builder supporting Deflate (method 8) via browser
 * CompressionStream('deflate-raw') with automatic Store (method 0) fallback.
 * Produces compact .zip archives (< 600 KB) compatible with WebIntoApp's 2 MB free limit.
 */

export interface ZipEntryInput {
  name: string;
  data: Uint8Array;
}

interface PreparedZipEntry {
  name: string;
  uncompressed: Uint8Array;
  payload: Uint8Array;
  method: 0 | 8;
  crc: number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

async function tryDeflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream !== 'function' || data.length < 64) {
    return null;
  }
  try {
    const copy = new Uint8Array(data.length);
    copy.set(data);
    const stream = new Blob([copy])
      .stream()
      .pipeThrough(new CompressionStream('deflate-raw' as CompressionFormat));
    const buf = await new Response(stream).arrayBuffer();
    const out = new Uint8Array(buf);
    return out.length > 0 && out.length < data.length ? out : null;
  } catch {
    return null;
  }
}

function assembleZipArchive(prepared: PreparedZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of prepared) {
    const nameBytes = encoder.encode(entry.name);
    const uncompressedSize = entry.uncompressed.length;
    const compressedSize = entry.payload.length;
    const crc = entry.crc;
    const method = entry.method;

    // Local file header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true); // Version needed to extract (2.0)
    lv.setUint16(6, 0x0800, true); // General purpose bit flag (UTF-8)
    lv.setUint16(8, method, true); // Compression method: 8 = Deflate, 0 = Store
    lv.setUint16(10, 0, true); // File last mod time
    lv.setUint16(12, 0x5421, true); // File last mod date
    lv.setUint32(14, crc, true); // CRC-32 of uncompressed data
    lv.setUint32(18, compressedSize, true); // Compressed size
    lv.setUint32(22, uncompressedSize, true); // Uncompressed size
    lv.setUint16(26, nameBytes.length, true); // File name length
    lv.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, entry.payload);

    // Central directory header (46 bytes + name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central file header signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, method, true); // Compression method: 8 = Deflate, 0 = Store
    cv.setUint16(12, 0, true); // Mod time
    cv.setUint16(14, 0x5421, true); // Mod date
    cv.setUint32(16, crc, true); // CRC-32
    cv.setUint32(20, compressedSize, true); // Compressed size
    cv.setUint32(24, uncompressedSize, true); // Uncompressed size
    cv.setUint16(28, nameBytes.length, true); // Name length
    cv.setUint16(30, 0, true); // Extra length
    cv.setUint16(32, 0, true); // Comment length
    cv.setUint16(34, 0, true); // Disk number start
    cv.setUint16(36, 0, true); // Internal attrs
    cv.setUint32(38, 0, true); // External attrs
    cv.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + entry.payload.length;
  }

  let centralSize = 0;
  for (const cp of centralParts) centralSize += cp.length;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, prepared.length, true);
  ev.setUint16(10, prepared.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + eocd.length;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of localParts) {
    result.set(part, pos);
    pos += part.length;
  }
  for (const part of centralParts) {
    result.set(part, pos);
    pos += part.length;
  }
  result.set(eocd, pos);
  return result;
}

export function createZipBytes(entries: ZipEntryInput[]): Uint8Array {
  return assembleZipArchive(
    entries.map((entry) => ({
      name: entry.name,
      uncompressed: entry.data,
      payload: entry.data,
      method: 0,
      crc: crc32(entry.data),
    }))
  );
}

export async function createZipBytesAsync(entries: ZipEntryInput[]): Promise<Uint8Array> {
  const prepared = await Promise.all(
    entries.map(async (entry): Promise<PreparedZipEntry> => {
      const deflated = await tryDeflateRaw(entry.data);
      return {
        name: entry.name,
        uncompressed: entry.data,
        payload: deflated ?? entry.data,
        method: deflated ? 8 : 0,
        crc: crc32(entry.data),
      };
    })
  );
  return assembleZipArchive(prepared);
}
