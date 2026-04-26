import * as fs from 'fs';
import * as path from 'path';

const dirs = ['./src/components', './src/components/settings'];

for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith('.tsx')) {
        const fullPath = path.join(dir, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        if (!content.includes('"use client"') && !content.includes("'use client'")) {
          fs.writeFileSync(fullPath, `"use client";\n` + content);
          console.log('Added use client to ' + fullPath);
        }
      }
    }
  }
}
