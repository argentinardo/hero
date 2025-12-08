# 🎮 Guía de Build para itch.io

## 📋 Pasos para crear la versión de itch.io

### 1. Ejecutar el build específico para itch.io

```bash
npm run build:itch
```

Este comando:
- ✅ Limpia la carpeta `dist/` anterior
- ✅ Ejecuta webpack en modo producción
- ✅ Copia todos los assets necesarios
- ✅ Corrige automáticamente todas las rutas absolutas a relativas
- ✅ Verifica que todos los archivos críticos estén presentes

### 2. Verificar el contenido de `dist/`

Después del build, la carpeta `dist/` debe contener:
- `index.html` (con rutas relativas)
- `*.js` (archivos JavaScript generados)
- `hero-logo.png`
- `qr.png`
- `manifest.json`
- `sw.js`
- `audio/` (carpeta con archivos de audio)
- `vendor/` (carpeta con CSS y fuentes)
- `images/` (carpeta con sprites)

### 3. Subir a itch.io

1. Comprime todo el contenido de la carpeta `dist/` en un archivo ZIP
2. En itch.io, ve a tu proyecto
3. Sube el ZIP como "HTML5" o "Web"
4. Asegúrate de que el archivo principal sea `index.html`

## ⚠️ Notas importantes

- **Rutas relativas**: Todas las rutas están configuradas como relativas (`./`) para funcionar en itch.io
- **No incluir node_modules**: Solo sube el contenido de `dist/`
- **Tamaño**: Verifica que el ZIP no exceda los límites de itch.io
- **Prueba localmente**: Antes de subir, puedes probar localmente abriendo `dist/index.html` en un navegador

## 🔧 Solución de problemas

Si encuentras errores después de subir:

1. **Rutas rotas**: Verifica que todas las rutas en `dist/index.html` sean relativas (`./`)
2. **Assets faltantes**: Asegúrate de que todos los archivos estén en `dist/`
3. **Errores de consola**: Abre las herramientas de desarrollador del navegador y revisa la consola

## 📝 Cambios realizados para itch.io

- ✅ `publicPath: './'` en webpack.config.js
- ✅ Todas las rutas en `index.html` cambiadas a relativas
- ✅ Rutas de audio cambiadas a relativas
- ✅ Rutas de configuración Auth0 cambiadas a relativas
- ✅ Script de build automatizado que corrige rutas
