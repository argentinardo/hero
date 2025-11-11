const fs = require('fs');
const path = require('path');

function copyAssets() {
  const distDir = path.resolve(__dirname, 'dist');
  
  // Asegurarse que dist existe
  if (!fs.existsSync(distDir)) {
    console.log(`Creating dist directory...`);
    fs.mkdirSync(distDir, { recursive: true });
  }

  const files = [
    {
      src: path.resolve(__dirname, 'src/assets/sprites/hero-logo.png'),
      dest: path.resolve(__dirname, 'dist/hero-logo.png'),
      name: 'hero-logo.png'
    },
    {
      src: path.resolve(__dirname, 'src/assets/sprites/qr.png'),
      dest: path.resolve(__dirname, 'dist/qr.png'),
      name: 'qr.png'
    }
  ];

  let copied = 0;
  let errors = 0;

  files.forEach(({ src, dest, name }) => {
    try {
      console.log(`Copying ${name}...`);
      console.log(`  From: ${src}`);
      console.log(`  To: ${dest}`);
      
      if (!fs.existsSync(src)) {
        throw new Error(`Source file does not exist: ${src}`);
      }

      const buffer = fs.readFileSync(src);
      fs.writeFileSync(dest, buffer);
      console.log(`✓ ${name} copied successfully (${buffer.length} bytes)`);
      copied++;
    } catch (err) {
      console.error(`✗ Failed to copy ${name}:`, err.message);
      errors++;
    }
  });

  console.log(`\n${copied} file(s) copied, ${errors} error(s)`);
  process.exit(errors > 0 ? 1 : 0);
}

copyAssets();
