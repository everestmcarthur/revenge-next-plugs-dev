import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { crc32, deflateRawSync } from 'node:zlib';

function createZip(files, outPath) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const uncompressed = file.data;
    const compressed = deflateRawSync(uncompressed);
    const crc = crc32(uncompressed);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(uncompressed.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    localHeaders.push(local, compressed);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(uncompressed.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    centralHeaders.push(central);
    offset += local.length + compressed.length;
  }

  const centralOffset = offset;
  const centralSize = centralHeaders.reduce((sum, b) => sum + b.length, 0);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  const fullZip = Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  writeFileSync(outPath, fullZip);
  console.log('Successfully packaged ' + outPath + ' (' + fullZip.length + ' bytes)');
}

const pluginDirName = process.argv[2] || 'slash-test-plugin';
const manifestPath = `plugins/${pluginDirName}/manifest.json`;
const scriptPath = `plugins/${pluginDirName}/build/js/index.js`;

if (!existsSync(manifestPath) || !existsSync(scriptPath)) {
  console.error(`Missing manifest or build at ${manifestPath} / ${scriptPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const manifestBuf = readFileSync(manifestPath);
const scriptBuf = readFileSync(scriptPath);

const outZip = `build/dist/${manifest.id}.zip`;
createZip([
  { name: 'manifest.json', data: manifestBuf },
  { name: 'index.js', data: scriptBuf }
], outZip);
