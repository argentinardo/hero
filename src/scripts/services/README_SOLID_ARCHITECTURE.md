# Arquitectura SOLID para el Sistema QR

Este documento explica cómo se aplicaron los principios SOLID al refactorizar la lógica del código QR.

## Estructura de Archivos

```
services/
├── qrCodeService.ts           # Lógica del QR (SRP)
├── deviceDetectionService.ts  # Detección de dispositivo (SRP)
├── qrCodeController.ts        # Orquestación (Coordinador)
└── README_SOLID_ARCHITECTURE.md
```

## Principios SOLID Aplicados

### 1. **Single Responsibility Principle (SRP)**

Cada clase tiene una única responsabilidad:

- **`QRCodeService`**: Gestiona solo la visibilidad y carga del código QR
  - No decide cuándo mostrar/ocultar
  - Solo expone métodos `show()` y `hide()`
  - Maneja estados internos: `isVisible`, `isLoaded`, `hasError`

- **`DeviceDetectionService`**: Detecta solo el tipo de dispositivo
  - No maneja UI
  - No depende de componentes del QR
  - Proporciona información sobre el dispositivo actual

- **`QRCodeController`**: Orquesta la lógica entre QR y dispositivo
  - Decide cuándo mostrar/ocultar QR
  - Reacciona a cambios de dispositivo
  - No maneja detalles de implementación

### 2. **Open/Closed Principle (OCP)**

El código está abierto para extensión pero cerrado para modificación:

```typescript
// Ejemplo: Extender para mostrar QR en TV
const config: QRCodeControllerConfig = {
    imageSrc: ...,
    titleText: ...,
    instructionsText: ...,
    shouldShowInTV: true  // ✓ Extensible sin modificar código
};
```

### 3. **Liskov Substitution Principle (LSP)**

Aunque no usamos interfaces explícitamente, el código puede substituir implementaciones:

```typescript
// Podría reemplazarse por una implementación diferente
const customQRService = new CustomQRCodeService();
const controller = new QRCodeController(elements, config, customQRService);
```

### 4. **Interface Segregation Principle (ISP)**

Interfaces específicas y pequeñas:

```typescript
// Interfaces pequeñas y focalizadas
interface QRCodeElements {
    container: HTMLElement;
    image: HTMLImageElement;
    title?: HTMLElement;
    instructions?: HTMLElement;
}

interface QRCodeConfig {
    imageSrc: string;
    titleText: string;
    instructionsText: string;
}

interface DeviceInfo {
    isDesktop: boolean;
    isMobile: boolean;
    // ... más propiedades específicas
}
```

### 5. **Dependency Inversion Principle (DIP)**

Las dependencias se inyectan en lugar de crear internamente:

```typescript
// ✓ DIP: Las dependencias se pasan como parámetros
new QRCodeController(
    elements,              // Dependency
    config,                // Dependency
    qrService,            // Optional: can be injected
    deviceService         // Optional: can be injected
);

// Si no se proporcionan, se usan instancias por defecto
const qrService = qrService || new QRCodeService();
const deviceService = deviceService || DeviceDetectionService.getInstance();
```

## Beneficios de esta Arquitectura

### 1. **Testabilidad**
```typescript
// Fácil de testear con mocks
const mockQRService = new MockQRCodeService();
const mockDeviceService = new MockDeviceDetectionService();
const controller = new QRCodeController(elements, config, mockQRService, mockDeviceService);
```

### 2. **Mantenibilidad**
- Cada clase tiene responsabilidades claras
- Cambios en lógica de detección no afectan QR
- Cambios en UI del QR no afectan detección de dispositivo

### 3. **Reusabilidad**
- `QRCodeService` puede usarse en otros contextos
- `DeviceDetectionService` es singleton y reutilizable
- `QRCodeController` se puede instanciar múltiples veces

### 4. **Escalabilidad**
- Fácil agregar nuevos tipos de dispositivos
- Fácil extender funcionalidad del QR
- Fácil agregar nuevos comportamientos

## Ejemplo de Uso

```typescript
// En ui.ts
const initializeQRCodeController = (): void => {
    // 1. Obtener elementos del DOM
    const qrContainer = document.getElementById('qr-code-container');
    const qrImage = document.getElementById('qr-code-image');
    // ...

    // 2. Crear controlador con configuración
    qrCodeController = new QRCodeController(
        { container: qrContainer, image: qrImage, ... },
        {
            imageSrc: SPRITE_SOURCES.qr,
            titleText: t('menu.qrScanToPlay'),
            instructionsText: t('menu.qrScanInstructions')
        }
    );

    // 3. Iniciar controlador (maneja el resto)
    qrCodeController.start();
};

// En startGame
if (qrCodeController) {
    qrCodeController.stop();  // Limpia recursos
    qrCodeController = null;
}
```

## Flujo de Ejecución

```
showMenu()
  ↓
initializeQRCodeController()
  ↓
new QRCodeController(elements, config)
  ├─ this.qrService = new QRCodeService()
  ├─ this.deviceService = DeviceDetectionService.getInstance()
  └─ initialize(qrService, deviceService)
  ↓
qrCodeController.start()
  ├─ updateQRVisibility()
  │  ├─ deviceService.detect()
  │  ├─ shouldShowQR(deviceInfo)
  │  └─ qrService.show() o hide()
  └─ onDeviceChange(callback) // Suscribirse a cambios
```

## Estados del QR

```typescript
interface QRCodeState {
    isVisible: boolean;    // ¿Se está mostrando?
    isLoaded: boolean;     // ¿La imagen se cargó?
    hasError: boolean;     // ¿Hay algún error?
}
```

## Depuración

Todos los servicios loguean con prefijo para identificar origen:

```
[QRCodeService] QR mostrado
[QRCodeService] Imagen cargada exitosamente
[DeviceDetectionService] Detectado: desktop, 1920x1080
[QRCodeController] Información del dispositivo: {...}
```

## Extensiones Futuras

### Agregar nuevo dispositivo:
```typescript
// En DeviceDetectionService
private isSmartWatch(): boolean {
    const ua = navigator.userAgent;
    return /Wear|Android Wear/i.test(ua);
}
```

### Agregar comportamiento nuevo:
```typescript
// En QRCodeController.shouldShowQR()
if (config.shouldShowOnSmartWatch && deviceInfo.isSmartWatch) {
    return true;
}
```

### Usar en otro contexto:
```typescript
// En otra pantalla o componente
const qrService = new QRCodeService();
qrService.initialize(elements, config);
qrService.show();  // ¡Reutilizable!
```

## Resumen

Esta arquitectura proporciona:
✓ **Código limpio** - Responsabilidades claras
✓ **Fácil de testear** - Inyección de dependencias
✓ **Mantenible** - Cambios localizados
✓ **Extensible** - Fácil agregar funcionalidad
✓ **Reusable** - Servicios independientes

