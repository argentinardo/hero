# Mejores Prácticas para Servicios SOLID

Este documento documenta las mejores prácticas aplicadas a los servicios QR y de detección de dispositivo.

## 1. Separación de Responsabilidades

### ❌ Malo: Todo mezclado
```typescript
// No hacer esto
function showQRIfDesktop() {
    const ua = navigator.userAgent;
    if (/Android|iPhone/.test(ua)) return;
    const el = document.getElementById('qr-container');
    el.classList.remove('hidden');
    const img = document.getElementById('qr-image');
    img.src = '/assets/qr.png';
    img.onload = () => console.log('cargado');
    // ... más lógica mezclada ...
}
```

### ✓ Bueno: Servicios separados
```typescript
// DeviceDetectionService - solo detecta dispositivo
class DeviceDetectionService {
    detect(): DeviceInfo { /* ... */ }
}

// QRCodeService - solo maneja QR
class QRCodeService {
    show(): void { /* ... */ }
    hide(): void { /* ... */ }
}

// QRCodeController - orquesta ambos
class QRCodeController {
    private updateQRVisibility() {
        if (this.deviceService.detect().isDesktop) {
            this.qrService.show();
        }
    }
}
```

## 2. Inyección de Dependencias

### ❌ Malo: Acoplamiento fuerte
```typescript
// No hacer esto
class QRCodeService {
    private deviceService = new DeviceDetectionService(); // ✗ Acoplado
    
    show() {
        if (this.deviceService.isDesktop()) {
            // ...
        }
    }
}
```

### ✓ Bueno: Inyección
```typescript
// Hacer esto
class QRCodeController {
    constructor(
        private qrService: QRCodeService,          // ✓ Inyectado
        private deviceService: DeviceDetectionService  // ✓ Inyectado
    ) {}
}

// Uso
const controller = new QRCodeController(
    new QRCodeService(),
    DeviceDetectionService.getInstance()
);
```

## 3. Manejo de Estados

### ❌ Malo: Estado implícito
```typescript
class QRCodeService {
    show() {
        this.element.classList.remove('hidden');
        // ¿Está realmente visible? ¿Se cargó la imagen?
    }
}
```

### ✓ Bueno: Estado explícito
```typescript
interface QRCodeState {
    isVisible: boolean;
    isLoaded: boolean;
    hasError: boolean;
}

class QRCodeService {
    private state: QRCodeState = {
        isVisible: false,
        isLoaded: false,
        hasError: false
    };
    
    getState(): Readonly<QRCodeState> {
        return Object.freeze({ ...this.state });
    }
}
```

## 4. Manejo de Errores

### ❌ Malo: Sin manejo
```typescript
show() {
    this.element.classList.remove('hidden');
    this.image.src = this.imageSrc;
}
```

### ✓ Bueno: Con manejo robusto
```typescript
show(): void {
    if (!this.elements) {
        console.warn('Elementos no inicializados');
        return;
    }
    
    try {
        this.elements.container.classList.remove(this.HIDDEN_CLASS);
        this.setImageSource();
        this.updateTexts();
        this.state.isVisible = true;
        this.notifyStateChange();
    } catch (error) {
        console.error('Error al mostrar QR:', error);
        this.state.hasError = true;
    }
}
```

## 5. Observers y Callbacks

### ❌ Malo: Cambios sin notificación
```typescript
class QRCodeService {
    show() {
        // Cambios sin que nadie se entere
        this.state.isVisible = true;
    }
}
```

### ✓ Bueno: Con notificaciones
```typescript
class QRCodeService {
    constructor(private onStateChange?: (state: QRCodeState) => void) {}
    
    show() {
        this.state.isVisible = true;
        this.notifyStateChange();  // ✓ Notificar
    }
    
    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange({ ...this.state });
        }
    }
}
```

## 6. Inmutabilidad en Retornos

### ❌ Malo: Retorna referencia mutable
```typescript
getState(): QRCodeState {
    return this.state;  // ✗ Pueden modificar directamente
}

// Uso problemático
const state = qrService.getState();
state.isVisible = false;  // ✗ Modificó el estado interno!
```

### ✓ Bueno: Retorna copia congelada
```typescript
getState(): Readonly<QRCodeState> {
    return Object.freeze({ ...this.state });  // ✓ No se puede modificar
}

// Uso seguro
const state = qrService.getState();
// state.isVisible = false;  // ✗ Error: Cannot assign to read only property
```

## 7. Logging Estructurado

### ❌ Malo: Logs poco claros
```typescript
console.log('QR mostrado');
console.log('Desktop:', isDesktop);
```

### ✓ Bueno: Logs con contexto
```typescript
private logDebug(message: string): void {
    console.log(`[QRCodeService] ${message}`, {
        visible: this.state.isVisible,
        loaded: this.state.isLoaded,
        error: this.state.hasError
    });
}

logDebug('QR mostrado');
// Output: [QRCodeService] QR mostrado { visible: true, loaded: false, error: false }
```

## 8. Singleton Pattern

### ✓ Bueno: Para servicios únicos
```typescript
export class DeviceDetectionService {
    private static instance: DeviceDetectionService;
    
    private constructor() {}
    
    public static getInstance(): DeviceDetectionService {
        if (!DeviceDetectionService.instance) {
            DeviceDetectionService.instance = new DeviceDetectionService();
        }
        return DeviceDetectionService.instance;
    }
}

// Uso: siempre la misma instancia
const service1 = DeviceDetectionService.getInstance();
const service2 = DeviceDetectionService.getInstance();
console.log(service1 === service2);  // true
```

## 9. Limpieza de Recursos

### ❌ Malo: Sin limpieza
```typescript
class QRCodeService {
    show() {
        this.image.onload = () => { /* ... */ };
    }
}
// Los listeners se acumulan
```

### ✓ Bueno: Con limpieza
```typescript
class QRCodeService {
    destroy(): void {
        if (this.elements?.image) {
            this.elements.image.onload = null;    // ✓ Limpiar
            this.elements.image.onerror = null;   // ✓ Limpiar
            this.elements.image.src = '';
        }
        this.elements = null;
        // ... limpieza más ...
    }
}

// Uso en ui.ts
if (qrCodeController) {
    qrCodeController.stop();  // ✓ Limpia recursos
    qrCodeController = null;
}
```

## 10. Type Safety

### ❌ Malo: Sin tipos
```typescript
function createController(elements, config) {
    // ¿Qué es elements? ¿Y config?
}
```

### ✓ Bueno: Con tipos explícitos
```typescript
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

class QRCodeController {
    constructor(
        elements: QRCodeElements,
        config: QRCodeConfig
    ) { /* ... */ }
}
```

## 11. Validación de Entrada

### ❌ Malo: Sin validación
```typescript
setImageSource(): void {
    this.image.src = this.config.imageSrc;  // ¿Existe?
}
```

### ✓ Bueno: Con validación
```typescript
setImageSource(): void {
    if (!this.elements?.image || !this.config?.imageSrc) {
        console.warn('No hay imagen o fuente configurada');
        return;
    }
    this.elements.image.src = this.config.imageSrc;
}
```

## 12. Documentación JSDoc

### ✓ Bueno: Documentado
```typescript
/**
 * Muestra el código QR
 * @throws {Error} Si no hay elementos inicializados
 * @example
 * qrService.show();
 */
public show(): void { /* ... */ }

/**
 * Obtiene el estado actual del QR
 * @returns {Readonly<QRCodeState>} Estado congelado (inmutable)
 */
public getState(): Readonly<QRCodeState> { /* ... */ }
```

## Resumen de Mejores Prácticas

| Práctica | Beneficio |
|----------|-----------|
| SRP | Código fácil de entender y cambiar |
| Inyección | Fácil de testear y extender |
| Estados explícitos | Debugging más fácil |
| Manejo de errores | Código más robusto |
| Observers | Cambios coordinados |
| Inmutabilidad | Evita bugs sutiles |
| Logging | Debugging más rápido |
| Singleton | Instancia única compartida |
| Limpieza | Sin memory leaks |
| Type Safety | Errores en compilación |
| Validación | Código defensivo |
| Documentación | Fácil de usar |

## Conclusión

Aplicar estos principios resulta en:
- **Código más limpio** y legible
- **Menos bugs** y más fácil de debuguear
- **Más testeable** con inyección de dependencias
- **Más mantenible** con responsabilidades claras
- **Más extensible** para futuras funcionalidades

