# 🚀 Quick Start - Sistema QR SOLID

## 📌 Para Desarrolladores Nuevos

Si acabas de entrar al proyecto y necesitas entender rápidamente el QR:

### 1. Archivo Principal donde se usa
```
src/scripts/components/ui.ts
```

Busca:
```typescript
initializeQRCodeController()  // Línea ~1010
```

### 2. Archivos de Código (Orden de lectura)

1. **qrCodeService.ts** (273 líneas)
   - Tarea: Gestionar visibilidad del QR
   - Entrada: elementos del DOM + configuración
   - Salida: mostrar/ocultar QR

2. **deviceDetectionService.ts** (237 líneas)
   - Tarea: Detectar tipo de dispositivo
   - Entrada: navegador
   - Salida: información del dispositivo

3. **qrCodeController.ts** (180 líneas)
   - Tarea: Orquestar ambos servicios
   - Entrada: elementos + servicios
   - Salida: QR automático según dispositivo

### 3. Documentación (Orden recomendado)

```
Para entender rápido:
1. Este archivo (QUICKSTART.md)
2. ARCHITECTURE_DIAGRAM.txt (visualizar flujo)
3. README_SOLID_ARCHITECTURE.md (conceptos SOLID)

Para profundizar:
4. BEST_PRACTICES.md (mejores prácticas)
5. REFACTORING_SUMMARY.md (cambios realizados)
```

## 🎯 Conceptos Clave

### El QR aparece automáticamente en:
- ✓ Desktop (pantallas grandes sin touch)

### El QR se oculta automáticamente en:
- ✓ Móviles
- ✓ Tablets
- ✓ TV

### El QR se limpia cuando:
- ✓ Se inicia el juego
- ✓ Se inicia el editor

## 💡 Ejemplos de Uso

### Caso 1: Ver el QR (Desktop)
```
1. Abre el juego en desktop
2. showMenu() se ejecuta
3. initializeQRCodeController() inicia
4. deviceService.detect() ve "isDesktop: true"
5. qrService.show() → QR visible ✓
```

### Caso 2: Ocultar el QR (Móvil)
```
1. Abre el juego en móvil
2. showMenu() se ejecuta
3. initializeQRCodeController() inicia
4. deviceService.detect() ve "isMobile: true"
5. qrService.hide() → QR oculto ✓
```

### Caso 3: Cambiar orientación
```
1. Usuario con tablet en modo vertical
2. QR está oculto (isTablet: true)
3. Usuario rota a horizontal
4. onDeviceChange() se ejecuta
5. deviceService.detect() ve "isDesktop: true" (ahora es bastante ancho)
6. qrService.show() → QR visible ✓
```

## 🔧 Si necesitas Modificar

### Modificar cuándo se muestra el QR
**Archivo:** `qrCodeController.ts` línea ~125
```typescript
private shouldShowQR(deviceInfo: DeviceInfo): boolean {
    // Mostrar QR solo en desktop
    if (deviceInfo.isDesktop) {
        return true;  // ← Cambiar lógica aquí
    }
    
    // Opcionalmente, permitir en TV
    if (this.config.shouldShowInTV && deviceInfo.isTV) {
        return true;
    }
    
    return false;
}
```

### Agregar soporte para TV
**Archivo:** `ui.ts` línea ~72
```typescript
qrCodeController = new QRCodeController(
    { /* ... */ },
    {
        imageSrc: qrSrc,
        titleText: t('menu.qrScanToPlay'),
        instructionsText: t('menu.qrScanInstructions'),
        shouldShowInTV: true  // ← Cambiar a true
    }
);
```

### Cambiar la imagen del QR
**Archivo:** `src/scripts/core/assets.ts` línea ~26
```typescript
import qrSrc from '../../assets/sprites/qr.png';  // ← Cambiar ruta

export const SPRITE_SOURCES: Record<string, string> = {
    // ...
    qr: qrSrc,  // ← Se usa aquí
};
```

### Cambiar textos del QR
**Archivo:** `src/locales/` (archivos de idioma)
```json
{
  "menu": {
    "qrScanToPlay": "ESCANEA PARA JUGAR EN MÓVIL",  // ← Cambiar aquí
    "qrScanInstructions": "Abre la cámara y escanea el código"  // ← Y aquí
  }
}
```

## 🐛 Debugging

### Ver qué se está detectando
1. Abre la consola (F12)
2. Ve los logs con prefijo `[QRCodeService]`, `[DeviceDetectionService]`, `[QRCodeController]`
3. Busca línea con información del dispositivo

### Ejemplo de output
```
[QRCodeController] Información del dispositivo: {
  isDesktop: true,
  isMobile: false,
  isTablet: false,
  isTV: false,
  hasTouch: false,
  resolution: 1920x1080,
  qrState: { visible: true, loaded: true, error: false }
}
```

### Si el QR no aparece
1. ¿Está en desktop? → Sí es desktop?
2. ¿La imagen carga? → Busca `Imagen cargada exitosamente`
3. ¿Hay error? → Busca `Error al cargar`
4. ¿Se limpió? → Busca `qrCodeController.stop()`

## 📋 Estructura de Carpetas

```
src/scripts/
├── services/                    ← Los nuevos servicios
│   ├── qrCodeService.ts        ← Lógica del QR
│   ├── deviceDetectionService.ts ← Detección dispositivo
│   ├── qrCodeController.ts     ← Orquestación
│   ├── index.ts                ← Exportaciones
│   ├── README_SOLID_ARCHITECTURE.md
│   ├── BEST_PRACTICES.md
│   ├── ARCHITECTURE_DIAGRAM.txt
│   ├── REFACTORING_SUMMARY.md
│   └── QUICKSTART.md            ← ¡ESTÁS AQUÍ!
│
├── components/
│   └── ui.ts                   ← Usa initializeQRCodeController()
│
├── core/
│   └── assets.ts               ← Define SPRITE_SOURCES.qr
│
├── utils/
│   └── device.ts               ← isDesktopMode(), isTvMode()
│
└── ...
```

## 🎓 Principios SOLID Explicados Brevemente

### S - Single Responsibility
- `QRCodeService` → solo QR
- `DeviceDetectionService` → solo detecta
- `QRCodeController` → solo orquesta

### O - Open/Closed
- Fácil extender sin cambiar código
- Ej: `shouldShowInTV: true`

### L - Liskov Substitution
- Puedes reemplazar servicios por mocks
- Perfecto para tests

### I - Interface Segregation
- Interfaces pequeñas y específicas
- No interfaces gigantes

### D - Dependency Inversion
- Inyectar dependencias
- No crear internas

## 📞 Preguntas Frecuentes

### ¿Por qué se ocultó el QR?
1. ¿Estás en desktop?
   - No → Es normal, está diseñado así
   - Sí → Ver sección Debugging

### ¿Cómo agrego el QR a otra pantalla?
```typescript
// 1. Obtener elementos del DOM
const qrContainer = document.getElementById('qr-container');
const qrImage = document.getElementById('qr-image');

// 2. Crear servicio
const qrService = new QRCodeService();

// 3. Inicializar
qrService.initialize(
    { container: qrContainer, image: qrImage },
    { imageSrc: SPRITE_SOURCES.qr, titleText: '...', instructionsText: '...' }
);

// 4. Mostrar
qrService.show();
```

### ¿Cómo testeo esto?
```typescript
import { QRCodeService } from '../services';

describe('QRCodeService', () => {
    it('should show QR code', () => {
        const qrService = new QRCodeService();
        // ... test logic ...
    });
});
```

## 🚀 Próximos Pasos

1. **Lee ARCHITECTURE_DIAGRAM.txt** - Visualiza el flujo
2. **Lee README_SOLID_ARCHITECTURE.md** - Entiende los principios
3. **Explora el código** - Lee qrCodeService.ts primero
4. **Experimenta** - Modifica algo pequeño y prueba

## 📚 Documentación Relacionada

- **README_SOLID_ARCHITECTURE.md** - Conceptos SOLID en detalle
- **BEST_PRACTICES.md** - 12 mejores prácticas aplicadas
- **REFACTORING_SUMMARY.md** - Cambios realizados
- **ARCHITECTURE_DIAGRAM.txt** - Diagramas visuales
- **REFACTORING_COMPLETE.md** (raíz) - Resumen completo

---

**¡Listo para empezar? Abre `qrCodeService.ts` y comienza a explorar! 🚀**

