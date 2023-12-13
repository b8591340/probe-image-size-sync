import { str2arr } from '../common.js';
import { sliceEq } from '../common.js';
import { readUInt16LE, readUInt16BE } from '../common.js';
import { readUInt32LE, readUInt32BE } from '../common.js';

const SIG_1 = str2arr('II\x2A\0');
const SIG_2 = str2arr('MM\0\x2A');

function readUInt16(buffer, offset, isBigEndian) {
  return isBigEndian ? readUInt16BE(buffer, offset) : readUInt16LE(buffer, offset);
}

function readUInt32(buffer, offset, isBigEndian) {
  return isBigEndian ? readUInt32BE(buffer, offset) : readUInt32LE(buffer, offset);
}

function readIFDValue(data, dataOffset, isBigEndian) {
  const type = readUInt16(data, dataOffset + 2, isBigEndian);
  const values = readUInt32(data, dataOffset + 4, isBigEndian);

  if (values !== 1 || (type !== 3 && type !== 4)) return null;

  if (type === 3) {
    return readUInt16(data, dataOffset + 8, isBigEndian);
  }

  return readUInt32(data, dataOffset + 8, isBigEndian);
}

export default function (data) {
  if (data.length < 8) return;

  if (!sliceEq(data, 0, SIG_1) && !sliceEq(data, 0, SIG_2)) return;

  const isBigEndian = data[0] === 77;
  const count = readUInt32(data, 4, isBigEndian) - 8;

  if (count < 0) return;

  let offset = count + 8;

  if (data.length - offset < 2) return;

  const ifdSize = readUInt16(data, offset + 0, isBigEndian) * 12;

  if (ifdSize <= 0) return;

  offset += 2;

  let i, width, height, tag;

  for (i = 0; i < ifdSize; i += 12) {
    tag = readUInt16(data, offset + i, isBigEndian);

    if (tag === 256) {
      width = readIFDValue(data, offset + i, isBigEndian);
    } else if (tag === 257) {
      height = readIFDValue(data, offset + i, isBigEndian);
    }
  }

  if (width && height) {
    return {
      width: width,
      height: height,
      type: 'tiff',
      mime: 'image/tiff',
      wUnits: 'px',
      hUnits: 'px'
    };
  }
};