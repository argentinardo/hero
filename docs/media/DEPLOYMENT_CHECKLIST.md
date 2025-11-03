# ✅ Checklist de Deployment - NEW H.E.R.O.

## 🌐 Web Deployment

### Pre-Deploy
- [ ] Código funciona en desarrollo (`npm run dev`)
- [ ] No hay errores en consola
- [ ] Todas las imágenes y assets cargan
- [ ] Controles funcionan (teclado y touch)
- [ ] Editor de niveles funciona
- [ ] Música y efectos de sonido funcionan

### Build
- [ ] `npm run build:web` ejecuta sin errores
- [ ] Carpeta `dist/` se genera correctamente
- [ ] Probar `dist/index.html` localmente

### Deploy a Netlify
1. [ ] Crear cuenta en Netlify
2. [ ] Conectar repositorio Git o subir `dist/` manualmente
3. [ ] Configurar build settings:
   - Build command: `npm run build:web`
   - Publish directory: `dist`
4. [ ] Deploy
5. [ ] Verificar URL pública

### Post-Deploy Web
- [ ] Probar en desktop
- [ ] Probar en móvil
- [ ] Verificar PWA (si aplica)
- [ ] Verificar performance

---

## 📱 Android Deployment

### Pre-Build
- [ ] Java JDK 11+ instalado
- [ ] Android Studio instalado
- [ ] Android SDK instalado (API 22+)
- [ ] Capacitor configurado (`capacitor.config.json`)

### Primera Configuración
- [ ] Ejecutar `setup-android.bat` o `setup-android.sh`
- [ ] Carpeta `android/` creada
- [ ] Proyecto abre en Android Studio sin errores
- [ ] Gradle sincroniza correctamente

### Testing en Emulador/Dispositivo
- [ ] APK de debug compila
- [ ] App instala en dispositivo/emulador
- [ ] Controles táctiles funcionan
- [ ] Joystick funciona correctamente
- [ ] Orientación landscape funciona
- [ ] Pantalla no se apaga durante juego
- [ ] Audio funciona

### Preparar Release APK

#### 1. Generar Keystore
```bash
keytool -genkey -v -keystore hero-release-key.keystore \
  -alias hero -keyalg RSA -keysize 2048 -validity 10000
```
- [ ] Keystore generado
- [ ] Passwords guardados de forma segura
- [ ] Keystore respaldado en lugar seguro

#### 2. Configurar Signing
Editar `android/app/build.gradle`:
- [ ] `signingConfigs` agregado
- [ ] `release` buildType configurado
- [ ] Proguard configurado (opcional)

#### 3. Build Release
```bash
cd android
./gradlew assembleRelease
```
- [ ] Build exitoso
- [ ] APK generado en `app/build/outputs/apk/release/`
- [ ] Tamaño de APK aceptable (< 50MB)

#### 4. Probar APK Release
- [ ] Instalar APK en dispositivo real
- [ ] Probar todas las funcionalidades
- [ ] Verificar performance
- [ ] Verificar que no hay logs de debug

### Optimizaciones Android
- [ ] `android:hardwareAccelerated="true"` en manifest
- [ ] `screenOrientation="landscape"` configurado
- [ ] `keepScreenOn="true"` configurado
- [ ] Permisos mínimos necesarios
- [ ] Íconos y splash screen configurados

### Google Play Console

#### Preparación
- [ ] Cuenta de Google Play Developer creada ($25 USD one-time)
- [ ] APK firmado listo
- [ ] Screenshots preparados (mínimo 2)
- [ ] Ícono de app (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Descripción de la app escrita
- [ ] Política de privacidad (URL requerida)
- [ ] Categoría seleccionada (Juegos > Arcade)
- [ ] Clasificación de contenido completada

#### Upload
- [ ] Crear nueva aplicación
- [ ] Subir APK o AAB
- [ ] Llenar información de la tienda
- [ ] Subir screenshots
- [ ] Configurar precios (Gratis)
- [ ] Seleccionar países
- [ ] Enviar a revisión

#### Post-Publish
- [ ] Link de Play Store guardado
- [ ] Monitorear reviews
- [ ] Responder a feedback
- [ ] Preparar actualizaciones

---

## 🔄 Updates

### Para actualizar el juego:

#### Web:
1. [ ] Hacer cambios
2. [ ] `npm run build:web`
3. [ ] Re-deploy a Netlify (automático con Git)

#### Android:
1. [ ] Hacer cambios
2. [ ] Incrementar `versionCode` en `build.gradle`
3. [ ] Actualizar `versionName` (ej: "1.0.1")
4. [ ] `npm run build:all`
5. [ ] Generar nuevo APK release
6. [ ] Subir a Play Console
7. [ ] Esperar aprobación

---

## 📊 Métricas a Monitorear

### Web
- [ ] Google Analytics configurado
- [ ] Bounce rate
- [ ] Tiempo promedio de sesión
- [ ] Páginas por sesión

### Android
- [ ] Installs
- [ ] Uninstalls
- [ ] Crashes (Play Console)
- [ ] ANRs (App Not Responding)
- [ ] Ratings y reviews
- [ ] Retención de usuarios

---

## 🐛 Testing Checklist

### Funcionalidad Core
- [ ] Movimiento del jugador
- [ ] Volar con jetpack
- [ ] Disparar láser
- [ ] Soltar bombas
- [ ] Colisiones con muros
- [ ] Colisiones con enemigos
- [ ] Recoger minero
- [ ] Completar nivel
- [ ] Game Over
- [ ] Sistema de vidas
- [ ] Sistema de energía
- [ ] Sistema de puntuación

### Editor de Niveles
- [ ] Cargar nivel
- [ ] Guardar nivel
- [ ] Restaurar nivel
- [ ] Generar nivel automático
- [ ] Guardar todo en JSON
- [ ] Cambiar entre niveles
- [ ] Pintar tiles
- [ ] Borrar tiles (con '0')

### Controles
- [ ] Teclado (Desktop)
- [ ] Joystick virtual (Móvil)
- [ ] Botones de acción (Móvil)
- [ ] Responsive

### Audio
- [ ] Música de fondo
- [ ] Efectos de sonido
- [ ] Mute/Unmute

---

## 📝 Notas Importantes

### Versiones
- Siempre incrementar `versionCode` para cada update en Android
- Usar semantic versioning: MAJOR.MINOR.PATCH (1.0.0, 1.0.1, 1.1.0, etc.)

### Backups
- Guardar keystore en múltiples ubicaciones seguras
- Si pierdes el keystore, no podrás actualizar la app en Play Store
- Hacer backup del código en Git

### Legal
- Política de privacidad requerida para Play Store
- Asegurar que tienes derechos sobre todos los assets
- Cumplir con COPPA si el juego es para niños

---

**¡Buena suerte con el deployment! 🚀**

