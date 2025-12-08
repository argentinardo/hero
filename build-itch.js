const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎮 Construyendo versión para itch.io...\n');

try {
    // 1. Limpiar dist anterior
    console.log('📦 Limpiando dist anterior...');
    if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true, force: true });
    }

    // 2. Build de producción
    console.log('🔨 Ejecutando build de producción...');
    execSync('webpack --mode=production', { stdio: 'inherit' });

    // 3. Copiar assets
    console.log('📋 Copiando assets...');
    execSync('node copy-assets.js', { stdio: 'inherit' });

    // 4. Verificar y corregir rutas en index.html
    console.log('🔍 Verificando rutas en index.html...');
    const indexPath = path.join('dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // Reemplazar rutas absolutas por relativas
        html = html.replace(/href="\//g, 'href="./');
        html = html.replace(/src="\//g, 'src="./');
        html = html.replace(/href='\//g, "href='./");
        html = html.replace(/src='\//g, "src='./");
        
        fs.writeFileSync(indexPath, html, 'utf8');
        console.log('✅ Rutas corregidas en index.html');
    }

    // 5. Corregir rutas en sw.js
    console.log('🔍 Verificando rutas en sw.js...');
    const swPath = path.join('dist', 'sw.js');
    if (fs.existsSync(swPath)) {
        let sw = fs.readFileSync(swPath, 'utf8');
        
        // Reemplazar rutas absolutas por relativas
        sw = sw.replace(/['"]\//g, match => match[0] + './');
        sw = sw.replace(/scope:\s*['"]\//g, "scope: './");
        
        fs.writeFileSync(swPath, sw, 'utf8');
        console.log('✅ Rutas corregidas en sw.js');
    }

    // 6. Corregir rutas en archivos vendor
    console.log('🔍 Verificando rutas en archivos vendor...');
    const vendorDir = path.join('dist', 'vendor');
    if (fs.existsSync(vendorDir)) {
        // Corregir tailwindcss-loader.js
        const loaderPath = path.join(vendorDir, 'tailwindcss-loader.js');
        if (fs.existsSync(loaderPath)) {
            let loader = fs.readFileSync(loaderPath, 'utf8');
            loader = loader.replace(/src\s*=\s*['"]\/vendor\//g, "src = './vendor/");
            loader = loader.replace(/src\s*=\s*['"]\/vendor\//g, 'src = "./vendor/');
            fs.writeFileSync(loaderPath, loader, 'utf8');
            console.log('✅ Rutas corregidas en tailwindcss-loader.js');
        }

        // Corregir press-start-2p.css
        const fontCssPath = path.join(vendorDir, 'press-start-2p.css');
        if (fs.existsSync(fontCssPath)) {
            let fontCss = fs.readFileSync(fontCssPath, 'utf8');
            fontCss = fontCss.replace(/url\(['"]?\/vendor\//g, "url(./");
            fontCss = fontCss.replace(/url\(['"]?\/vendor\//g, "url('./");
            fs.writeFileSync(fontCssPath, fontCss, 'utf8');
            console.log('✅ Rutas corregidas en press-start-2p.css');
        }
    }

    // 6. Verificar archivos críticos
    console.log('\n📋 Verificando archivos críticos...');
    const criticalFiles = [
        'dist/index.html',
        'dist/hero-logo.png',
        'dist/qr.png',
        'dist/manifest.json',
        'dist/sw.js'
    ];

    let allOk = true;
    criticalFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} - FALTANTE`);
            allOk = false;
        }
    });

    // 8. Verificar que hay archivos JS
    const jsFiles = fs.readdirSync('dist').filter(f => f.endsWith('.js'));
    if (jsFiles.length > 0) {
        console.log(`✅ ${jsFiles.length} archivo(s) JS generado(s)`);
    } else {
        console.log('❌ No se encontraron archivos JS');
        allOk = false;
    }

    if (allOk) {
        console.log('\n✅ Build completado exitosamente para itch.io!');
        console.log('📁 Los archivos están en la carpeta dist/');
        console.log('🚀 Puedes subir el contenido de dist/ a itch.io');
    } else {
        console.log('\n⚠️  Build completado con advertencias');
        process.exit(1);
    }
} catch (error) {
    console.error('\n❌ Error durante el build:', error.message);
    process.exit(1);
}
