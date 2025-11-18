const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const vendorDir = path.resolve(__dirname, 'public/vendor');

// Crear directorio si no existe
if (!fs.existsSync(vendorDir)) {
  fs.mkdirSync(vendorDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Seguir redirecciones
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadAssets() {
  console.log('Descargando recursos externos...\n');
  
  const assets = [
    {
      url: 'https://unpkg.com/tailwindcss@3.4.1/lib/index.js',
      dest: path.join(vendorDir, 'tailwindcss-full.js'),
      name: 'Tailwind CSS Full'
    },
    {
      url: 'https://unpkg.com/nes.css@2.3.0/css/nes.min.css',
      dest: path.join(vendorDir, 'nes.min.css'),
      name: 'NES.css'
    },
    {
      url: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
      dest: path.join(vendorDir, 'press-start-2p.css'),
      name: 'Press Start 2P Font'
    }
  ];
  
  for (const asset of assets) {
    try {
      console.log(`Descargando ${asset.name}...`);
      await downloadFile(asset.url, asset.dest);
    } catch (error) {
      console.error(`✗ Error descargando ${asset.name}:`, error.message);
    }
  }
  
  console.log('\n✓ Descarga completada!');
}

downloadAssets().catch(console.error);

