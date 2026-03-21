import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIR = join(process.cwd(), 'public/images/styles');
const TARGET_KB = 100;

const files = readdirSync(DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

for (const file of files) {
  const filePath = join(DIR, file);
  const sizeBefore = statSync(filePath).size;

  if (sizeBefore <= TARGET_KB * 1024) {
    console.log(`✓ ${file} already ${(sizeBefore / 1024).toFixed(0)}KB — skipped`);
    continue;
  }

  // Resize to max 800px wide and compress to JPEG ~80 quality
  const outPath = filePath.replace(/\.(jpg|jpeg|png|webp)$/i, '.jpg');
  await sharp(filePath)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toFile(outPath + '.tmp');

  // Replace original
  const { rename, unlink } = await import('fs/promises');
  if (outPath !== filePath) await unlink(filePath);
  await rename(outPath + '.tmp', outPath);

  const sizeAfter = statSync(outPath).size;
  console.log(`✓ ${file} ${(sizeBefore / 1024).toFixed(0)}KB → ${(sizeAfter / 1024).toFixed(0)}KB`);
}

console.log('\nDone!');
