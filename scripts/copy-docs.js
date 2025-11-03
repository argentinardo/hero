/**
 * Script para copiar la documentación generada a la carpeta dist
 * Esto permite que la documentación esté disponible en el deploy de Netlify
 */

const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

const docsDir = path.join(__dirname, '..', 'docs');
const distDocsDir = path.join(__dirname, '..', 'dist', 'docs');

if (!fs.existsSync(docsDir)) {
    console.error('Error: La carpeta docs no existe. Ejecuta npm run docs:generate primero.');
    process.exit(1);
}

console.log('Copiando documentación a dist/docs...');
copyDir(docsDir, distDocsDir);
console.log('✅ Documentación copiada exitosamente a dist/docs');

