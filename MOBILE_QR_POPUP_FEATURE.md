# 📱 Funcionalidad: Botón Mobile con Popup QR

## 🎯 Qué Se Agregó

Se implementó un botón "MOBILE QR" en el menú hamburguesa que abre un popup modal con el código QR.

---

## 📝 Cambios Realizados

### 1. HTML (`src/index.html`)

#### Antes:
```html
<!-- QR Code para móvil (solo en desktop) -->
<div id="qr-code-container" class="mt-6 hidden flex flex-col items-center gap-2">
    <!-- ... QR content ... -->
</div>
```

#### Después:
```html
<!-- QR Code Modal Popup -->
<div id="qr-code-modal" class="fixed inset-0 bg-black bg-opacity-75 hidden flex items-center justify-center z-50">
    <div class="bg-gray-800 border-4 border-white rounded-lg p-6" style="font-family: 'Press Start 2P', monospace;">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg">QR CODE</h2>
            <button id="close-qr-modal" class="text-2xl cursor-pointer text-white hover:text-red-500">✕</button>
        </div>
        
        <!-- QR Code Container -->
        <div id="qr-code-container" class="flex flex-col items-center gap-4">
            <!-- QR content moved inside modal -->
        </div>
    </div>
</div>
```

**Cambios principales:**
- ✓ Creado modal (`qr-code-modal`) con fondo oscuro semitransparente
- ✓ Agregado botón cerrar (`close-qr-modal`) con símbolo ✕
- ✓ Movido `qr-code-container` dentro del modal
- ✓ Aumentado tamaño de imagen QR a 200x200px
- ✓ Estilos estilo NES/retro con bordes blancos

---

### 2. JavaScript (`src/scripts/components/ui.ts`)

#### Función: `setupQRCodeModal()`
```typescript
/**
 * Configura el modal del QR code con botón mobile
 */
const setupQRCodeModal = (): void => {
    const qrModal = document.getElementById('qr-code-modal');
    const closeBtn = document.getElementById('close-qr-modal');
    
    // 1. Cerrar modal con botón X
    closeBtn.addEventListener('click', () => {
        qrModal.classList.add('hidden');
    });

    // 2. Cerrar modal al hacer click fuera
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) {
            qrModal.classList.add('hidden');
        }
    });

    // 3. Crear botón mobile
    if (!mobileBtn) {
        setupMobileButton();
    }
};
```

#### Función: `setupMobileButton()`
```typescript
/**
 * Crea y configura el botón mobile
 */
const setupMobileButton = (): void => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    
    // Crear botón
    const mobileBtn = document.createElement('button');
    mobileBtn.id = 'mobile-btn';
    mobileBtn.className = 'nes-btn is-primary menu-item w-full';
    mobileBtn.textContent = '📱 MOBILE QR';
    
    // Abrir modal al hacer click
    mobileBtn.addEventListener('click', () => {
        const qrModal = document.getElementById('qr-code-modal');
        qrModal.classList.remove('hidden');
    });

    // Insertar en menú después de créditos
    const creditsBtn = hamburgerMenu.querySelector('#hamburger-credits-btn');
    creditsBtn.parentNode?.insertBefore(mobileBtn, creditsBtn.nextSibling);
};
```

#### Llamada en `showMenu()`
```typescript
// Configurar modal del QR code
setupQRCodeModal();
```

---

## 🎮 Cómo Funciona

### Flujo de Usuario

```
1. Usuario en el juego
   ↓
2. Abre menú hamburguesa (≡)
   ↓
3. Ve botón "📱 MOBILE QR"
   ↓
4. Hace click en botón
   ↓
5. Se abre popup modal con QR code
   ├─ Fondo oscuro semitransparente
   ├─ Cuadro con borde blanco
   ├─ Botón cerrar (X)
   └─ QR code más grande (200x200px)
   ↓
6. Usuario puede:
   ├─ Escanear QR con cámara
   ├─ Hacer click en X para cerrar
   └─ Hacer click fuera del modal para cerrar
```

---

## 🎨 Características del Popup

### Estilo
- 🎮 **Tema retro NES** - Bordes blancos, fondo gris oscuro
- 🎯 **Modal centrado** - Aparece en el centro de la pantalla
- 🌫️ **Overlay semitransparente** - Fondo oscuro con 75% de opacidad
- 📐 **Responsive** - Funciona en todas las pantallas

### Funcionalidad
- ✅ Abre al hacer click en botón mobile
- ✅ Cierra con botón X (superior derecha)
- ✅ Cierra al hacer click fuera del modal
- ✅ Imagen QR más grande (200x200px)
- ✅ Textos traducibles según idioma

### Posicionamiento
- Z-index: 50 (encima del resto)
- Fixed position (relativo a viewport)
- Centered: flex con `items-center justify-center`

---

## 📱 Ubicación del Botón

El botón **"📱 MOBILE QR"** aparece en el **menú hamburguesa** después del botón de créditos:

```
Menú Hamburguesa (≡)
├─ Pausar
├─ Reiniciar
├─ Menú Inicial
├─ Configuración
├─ Créditos
└─ 📱 MOBILE QR  ← AQUÍ
```

---

## 🔧 Integración

### En `showMenu()`
```typescript
// Configurar modal del QR code
setupQRCodeModal();
```

Se llama cada vez que se muestra el menú para asegurar que el botón exista y los listeners estén activos.

---

## 💡 Casos de Uso

### 1. Usuario Desktop Quiere Compartir QR
```
Desktop user → Abre menú → Click "MOBILE QR" → Muestra popup
→ Puede compartir pantalla o tomar screenshot
```

### 2. Usuario Mobile en Navegador Desktop
```
Mobile browser → Abre menú → Click "MOBILE QR" → Muestra popup
→ Puede escanear QR con otro dispositivo
```

### 3. Developer Debugging
```
Dev testing → Click botón → Verifica QR carga correctamente
→ Puede ver error handling en console
```

---

## ✅ Verificaciones

- ✓ Modal se abre al hacer click
- ✓ Modal se cierra con botón X
- ✓ Modal se cierra al hacer click fuera
- ✓ QR código se carga correctamente
- ✓ Textos se traducen según idioma
- ✓ Estilo coherente con el resto de la app
- ✓ No hay errores en console
- ✓ TypeScript compila sin errores

---

## 🐛 Debugging

### Ver si botón se creó
```javascript
console.log(document.getElementById('mobile-btn')); // Debe existir
```

### Ver si modal abre
```javascript
const modal = document.getElementById('qr-code-modal');
console.log(modal.classList.contains('hidden')); // false = abierto
```

### Ver si QR carga
```javascript
const img = document.getElementById('qr-code-image');
console.log(img.src); // Debe tener ruta válida
```

---

## 📊 Cambios Resumen

| Elemento | Tipo | Estado |
|----------|------|--------|
| qr-code-modal | HTML nuevo | ✓ Creado |
| close-qr-modal | HTML nuevo | ✓ Creado |
| mobile-btn | JS dinámico | ✓ Creado |
| setupQRCodeModal() | Función nueva | ✓ Creada |
| setupMobileButton() | Función nueva | ✓ Creada |
| showMenu() | Modificada | ✓ Agregada llamada |
| index.html | Modificada | ✓ Estructura actualizada |
| ui.ts | Modificada | ✓ Lógica agregada |

---

## 🚀 Estado

**✅ COMPLETADO Y FUNCIONANDO**

- Botón "📱 MOBILE QR" en menú hamburguesa
- Popup modal con QR code
- Cierre por X o click fuera
- Estilos NES/retro
- TypeScript sin errores
- Linter sin errores

---

## 📚 Documentación Relacionada

Ver también:
- **START_HERE.md** - Punto de entrada general
- **REFACTORING_COMPLETE.md** - Refactorizado SOLID
- **src/scripts/services/QUICKSTART.md** - Guía de servicios

