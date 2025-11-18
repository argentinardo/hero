# Cómo Ver los Logs de la App que se Cierra

## Método 1: Script Automático (Más Fácil)

1. Abre una terminal en la carpeta del proyecto
2. Ejecuta: `ver-logs.bat`
3. **Luego** abre la app en tu dispositivo
4. Los logs aparecerán en la terminal

## Método 2: Comando Manual

```bash
adb logcat -c
adb logcat | findstr /i "Bootstrap Main ERROR FATAL chromium console"
```

Luego abre la app en tu dispositivo.

## Método 3: Android Studio Logcat

1. Abre Android Studio
2. Conecta tu dispositivo
3. Ve a la pestaña **Logcat** (abajo)
4. Filtra por: `com.newhero.game` o busca `ERROR`
5. Abre la app en tu dispositivo

## Qué Buscar

Busca líneas que contengan:
- `ERROR`
- `FATAL`
- `Bootstrap`
- `Main`
- `AndroidRuntime`

## Si No Ves Logs

Asegúrate de que:
1. El dispositivo esté conectado por USB
2. La depuración USB esté habilitada
3. Ejecutes `adb devices` y veas tu dispositivo listado

