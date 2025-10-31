# 📚 Guía para Ver la Documentación JSDoc

Esta guía te explica todas las formas de ver la documentación JSDoc que hemos agregado al proyecto.

## 🎯 Formas de Ver la Documentación

### 1. **En el IDE (VSCode/Cursor) - Método Más Rápido** ⚡

La forma más rápida es directamente en tu editor:

#### **Hover sobre funciones/clases**
- Simplemente pasa el cursor sobre cualquier función o clase
- Verás un tooltip con toda la documentación JSDoc

**Ejemplo**:
```typescript
// Pasa el cursor sobre updateCamera
updateCamera();
// ↓ Verás el tooltip con toda la documentación
```

#### **Panel de información**
- Abre una función/clase
- La documentación aparece en el panel lateral (si está habilitado)

#### **Go to Definition (F12)**
- Haz clic derecho sobre una función → "Go to Definition"
- O presiona `F12`
- Verás el código con toda la documentación JSDoc

---

### 2. **Generar Documentación HTML con TypeDoc** 🌐

Para generar una documentación HTML navegable completa:

#### **Paso 1: Instalar TypeDoc**
```bash
# Si usas pnpm (recomendado para este proyecto)
pnpm add -D typedoc@latest

# O si usas npm
npm install --save-dev typedoc@latest --legacy-peer-deps
```

#### **Paso 2: Generar documentación**
```bash
npm run docs:generate
```

Esto generará una carpeta `docs/` con la documentación HTML completa.

#### **Paso 3: Ver la documentación**
```bash
npm run docs:serve
```

Esto:
- Genera la documentación
- Abre un servidor local en `http://localhost:8081`
- Abre automáticamente tu navegador

#### **O manualmente**:
```bash
# Generar docs
npm run docs:generate

# Abrir en navegador
# Abre docs/index.html en tu navegador
```

---

### 3. **Usar Extensiones de VSCode** 🔌

Puedes instalar extensiones para mejorar la visualización:

#### **JSDoc Tag Highlighter**
- Resalta los tags JSDoc en el código
- Facilita la lectura de la documentación

#### **Document This**
- Genera automáticamente comentarios JSDoc
- Útil para documentar nuevas funciones

---

### 4. **Ver Documentación en Navegador (VSCode/Cursor)** 🌐

Algunos IDEs permiten abrir la documentación en un panel del navegador:

1. Haz clic derecho sobre una función
2. Selecciona "Open Documentation" o "Show Documentation"
3. Se abre en un panel lateral

---

## 🚀 Configuración Rápida

### Generar Documentación HTML (Una vez configurado)

```bash
# 1. Instalar TypeDoc (solo primera vez)
# Si usas pnpm (recomendado):
pnpm add -D typedoc@latest

# O si usas npm:
npm install --save-dev typedoc@latest --legacy-peer-deps

# 2. Generar documentación
npm run docs:generate
# O con pnpm:
pnpm docs:generate

# 3. Ver en navegador
# Abre docs/index.html manualmente
# O usa:
npm run docs:serve
# O con pnpm:
pnpm docs:serve
```

---

## 📍 Dónde Está la Documentación

### Archivos Documentados

Los siguientes archivos tienen documentación JSDoc completa:

1. **`src/scripts/main.ts`**
   - `updateCamera()` - Implementación de cámara
   - `checkMinerRescue()` - Mecánica de rescate
   - `updateGameState()` - Loop de actualización
   - `gameLoop()` - Loop principal
   - `bootstrap()` - Inicialización

2. **`src/scripts/components/player.ts`**
   - Documentación de principios SOLID aplicados
   - Funciones principales del jugador

3. **`src/scripts/components/enemy.ts`**
   - Documentación de principios SOLID aplicados
   - Sistema extensible de enemigos

4. **`src/scripts/components/level.ts`**
   - Documentación de principios SOLID aplicados
   - Gestión de niveles

---

## 💡 Tips para Leer la Documentación

### Estructura de un Comentario JSDoc

```typescript
/**
 * Descripción breve de la función
 * 
 * Descripción detallada (opcional)
 * Puede incluir múltiples párrafos
 * 
 * @param nombreParam - Descripción del parámetro
 * @returns Descripción del valor de retorno
 * @remarks Notas adicionales
 * @see OtraFunción - Referencia a otra función relacionada
 */
```

### Tags Útiles

- `@param` - Documenta parámetros
- `@returns` - Documenta el valor de retorno
- `@remarks` - Notas adicionales
- `@see` - Referencias a otros documentos
- `@example` - Ejemplos de uso
- `@async` - Indica que es una función asíncrona

---

## 🔍 Ejemplos de Visualización

### En el Código (VSCode/Cursor)

```typescript
/**
 * Actualiza la posición de la cámara siguiendo al jugador.
 * 
 * IMPLEMENTACIÓN DE CÁMARA:
 * - Deadzone vertical: La cámara se mueve solo cuando...
 * 
 * @remarks Esta función modifica directamente store.cameraX y store.cameraY
 */
const updateCamera = () => { ... }

// ↑ Pasa el cursor aquí y verás todo esto en un tooltip
```

### En TypeDoc HTML

La documentación HTML generada incluirá:
- Navegación lateral con todas las funciones
- Búsqueda de funciones
- Links entre funciones relacionadas
- Ejemplos de código
- Índice alfabético

---

## 🎯 Para Entrevistas Técnicas

### Mostrar Documentación

1. **En el IDE**: Abre el código y muestra los tooltips de JSDoc
2. **TypeDoc HTML**: Comparte el link o abre `docs/index.html`
3. **Archivos Markdown**: Muestra `ARCHITECTURE_DECISIONS.md` y otros docs

### Lo Que Impresiona

✅ Documentación completa con JSDoc
✅ Decisiones técnicas justificadas
✅ Principios SOLID aplicados y documentados
✅ Ejemplos de código con explicaciones

---

## 📝 Comandos Útiles

```bash
# Generar documentación
npm run docs:generate

# Generar y servir (abre navegador)
npm run docs:serve

# Ver documentación en navegador manualmente
# Windows:
start docs/index.html

# Mac/Linux:
open docs/index.html
```

---

## 🎓 Recursos Adicionales

- [TypeDoc Documentation](https://typedoc.org/)
- [JSDoc Reference](https://jsdoc.app/)
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) - Decisiones técnicas
- [TECHNICAL_INTERVIEW_GUIDE.md](./TECHNICAL_INTERVIEW_GUIDE.md) - Guía para entrevistas

---

**¡Ahora puedes explorar toda la documentación JSDoc del proyecto!** 🚀

