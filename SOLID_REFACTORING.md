# Aplicación de Principios SOLID al Proyecto H.E.R.O.

## 📚 Índice
1. [¿Qué es SOLID?](#qué-es-solid)
2. [Análisis del Código Actual](#análisis-del-código-actual)
3. [Violaciones Identificadas](#violaciones-identificadas)
4. [Plan de Refactorización](#plan-de-refactorización)
5. [Implementación](#implementación)

---

## ¿Qué es SOLID?

SOLID es un acrónimo de cinco principios de diseño orientado a objetos que ayudan a crear software más mantenible, escalable y robusto.

### S - Single Responsibility Principle (SRP)
**Principio de Responsabilidad Única**

> "Una clase debe tener una, y solo una, razón para cambiar"

**Significado:** Cada módulo, clase o función debe tener una sola responsabilidad o propósito. Si un módulo hace demasiadas cosas, se vuelve difícil de mantener y probar.

**Ejemplo Simple:**
```typescript
// ❌ VIOLACIÓN: Esta clase tiene múltiples responsabilidades
class User {
    name: string;
    
    saveToDatabase() { /* ... */ }  // Responsabilidad: persistencia
    sendEmail() { /* ... */ }       // Responsabilidad: comunicación
    calculateAge() { /* ... */ }    // Responsabilidad: lógica de negocio
}

// ✅ CORRECTO: Cada clase tiene una única responsabilidad
class User {
    name: string;
    calculateAge() { /* ... */ }
}

class UserRepository {
    saveToDatabase(user: User) { /* ... */ }
}

class EmailService {
    sendEmail(user: User) { /* ... */ }
}
```

---

### O - Open/Closed Principle (OCP)
**Principio Abierto/Cerrado**

> "Las entidades de software deben estar abiertas para extensión, pero cerradas para modificación"

**Significado:** Debes poder agregar nueva funcionalidad sin modificar el código existente. Esto se logra usando abstrac ciones (interfaces) y polimorfismo.

**Ejemplo Simple:**
```typescript
// ❌ VIOLACIÓN: Para agregar un nuevo tipo, hay que modificar el código existente
function calculateArea(shape: any) {
    if (shape.type === 'circle') {
        return Math.PI * shape.radius ** 2;
    } else if (shape.type === 'rectangle') {
        return shape.width * shape.height;
    }
    // Para agregar triangulo, hay que modificar esta función
}

// ✅ CORRECTO: Abierto para extensión, cerrado para modificación
interface Shape {
    calculateArea(): number;
}

class Circle implements Shape {
    constructor(private radius: number) {}
    calculateArea(): number {
        return Math.PI * this.radius ** 2;
    }
}

class Rectangle implements Shape {
    constructor(private width: number, private height: number) {}
    calculateArea(): number {
        return this.width * this.height;
    }
}

// Puedo agregar nuevas formas sin modificar código existente
class Triangle implements Shape {
    constructor(private base: number, private height: number) {}
    calculateArea(): number {
        return (this.base * this.height) / 2;
    }
}
```

---

### L - Liskov Substitution Principle (LSP)
**Principio de Sustitución de Liskov**

> "Los objetos de una superclase deben poder ser reemplazados por objetos de sus subclases sin romper la aplicación"

**Significado:** Las clases derivadas deben poder sustituir a sus clases base sin que el programa deje de funcionar correctamente.

**Ejemplo Simple:**
```typescript
// ❌ VIOLACIÓN: Square viola LSP porque cambia el comportamiento esperado
class Rectangle {
    constructor(protected width: number, protected height: number) {}
    
    setWidth(width: number) { this.width = width; }
    setHeight(height: number) { this.height = height; }
    
    getArea() { return this.width * this.height; }
}

class Square extends Rectangle {
    setWidth(width: number) {
        this.width = width;
        this.height = width; // Comportamiento inesperado!
    }
    
    setHeight(height: number) {
        this.width = height;  // Comportamiento inesperado!
        this.height = height;
    }
}

// Código que usa Rectangle
function test(rect: Rectangle) {
    rect.setWidth(5);
    rect.setHeight(4);
    console.log(rect.getArea()); // Esperamos 20, pero con Square obtenemos 16
}

// ✅ CORRECTO: Usar composición en lugar de herencia
interface Shape {
    getArea(): number;
}

class Rectangle implements Shape {
    constructor(private width: number, private height: number) {}
    getArea() { return this.width * this.height; }
}

class Square implements Shape {
    constructor(private side: number) {}
    getArea() { return this.side ** 2; }
}
```

---

### I - Interface Segregation Principle (ISP)
**Principio de Segregación de Interfaces**

> "Los clientes no deben ser forzados a depender de interfaces que no usan"

**Significado:** Es mejor tener varias interfaces específicas que una grande y general. Las clases no deberían implementar métodos que no necesitan.

**Ejemplo Simple:**
```typescript
// ❌ VIOLACIÓN: Interfaz demasiado grande
interface Worker {
    work(): void;
    eat(): void;
    sleep(): void;
}

class Human implements Worker {
    work() { /* ... */ }
    eat() { /* ... */ }
    sleep() { /* ... */ }
}

class Robot implements Worker {
    work() { /* ... */ }
    eat() { throw new Error("Robots don't eat!"); } // ❌ Método innecesario
    sleep() { throw new Error("Robots don't sleep!"); } // ❌ Método innecesario
}

// ✅ CORRECTO: Interfaces segregadas
interface Workable {
    work(): void;
}

interface Eatable {
    eat(): void;
}

interface Sleepable {
    sleep(): void;
}

class Human implements Workable, Eatable, Sleepable {
    work() { /* ... */ }
    eat() { /* ... */ }
    sleep() { /* ... */ }
}

class Robot implements Workable {
    work() { /* ... */ } // Solo implementa lo que necesita
}
```

---

### D - Dependency Inversion Principle (DIP)
**Principio de Inversión de Dependencias**

> "Depende de abstracciones, no de concreciones"

**Significado:** Los módulos de alto nivel no deben depender de módulos de bajo nivel. Ambos deben depender de abstracciones (interfaces).

**Ejemplo Simple:**
```typescript
// ❌ VIOLACIÓN: Alto acoplamiento
class MySQLDatabase {
    save(data: string) { /* guardar en MySQL */ }
}

class UserService {
    private database = new MySQLDatabase(); // ❌ Dependencia directa de implementación
    
    saveUser(user: string) {
        this.database.save(user);
    }
}

// ✅ CORRECTO: Inyección de dependencias con abstracciones
interface Database {
    save(data: string): void;
}

class MySQLDatabase implements Database {
    save(data: string) { /* guardar en MySQL */ }
}

class MongoDatabase implements Database {
    save(data: string) { /* guardar en MongoDB */ }
}

class UserService {
    // Depende de la abstracción, no de la implementación
    constructor(private database: Database) {}
    
    saveUser(user: string) {
        this.database.save(user);
    }
}

// Uso: puedo cambiar la implementación fácilmente
const service1 = new UserService(new MySQLDatabase());
const service2 = new UserService(new MongoDatabase());
```

---

## Análisis del Código Actual

### Estructura Actual del Proyecto
```
src/scripts/
├── main.ts              # Punto de entrada, game loop
├── core/
│   ├── state.ts         # Estado global del juego
│   ├── types.ts         # Definiciones de tipos
│   ├── constants.ts     # Constantes
│   ├── collision.ts     # Detección de colisiones
│   └── assets.ts        # Carga de recursos
└── components/
    ├── player.ts        # Lógica del jugador
    ├── enemy.ts         # Lógica de enemigos
    ├── bomb.ts          # Lógica de bombas/explosiones
    ├── laser.ts         # Lógica de láseres
    ├── level.ts         # Gestión de niveles
    ├── light.ts         # Sistema de iluminación
    ├── render.ts        # Renderizado
    ├── ui.ts            # Interfaz de usuario
    └── effects.ts       # Efectos visuales
```

---

## Violaciones Identificadas

### 1. ❌ Violación de SRP (Single Responsibility)

#### `player.ts`
```typescript
// Este archivo hace DEMASIADAS cosas:
// 1. Manejo de input del jugador
// 2. Física del movimiento
// 3. Colisiones
// 4. Animaciones
// 5. Muerte del jugador
// 6. Emisión de partículas
// 7. Manejo del vuelo/jet pack
```

**Problema:** Si necesitas cambiar la lógica de animación, tienes que modificar el mismo archivo que maneja las colisiones. Esto aumenta el riesgo de introducir bugs.

#### `main.ts`
```typescript
// Responsabilidades:
// 1. Inicialización del juego
// 2. Game loop
// 3. Gestión de estado
// 4. Actualización de cámara
// 5. Chequeo de rescate del minero
```

---

### 2. ❌ Violación de OCP (Open/Closed)

#### `enemy.ts` - Sistema de Enemigos
```typescript
export const updateEnemies = (store: GameStore) => {
    store.enemies.forEach(enemy => {
        switch (enemy.type) {
            case 'bat': { /* lógica específica */ break; }
            case 'spider': { /* lógica específica */ break; }
            case 'viper': { /* lógica específica */ break; }
        }
    });
};
```

**Problema:** Para agregar un nuevo tipo de enemigo, tienes que:
1. Modificar la función `updateEnemies` (violando OCP)
2. Agregar un nuevo case al switch
3. Modificar el renderizado
4. Potencialmente romper la lógica existente

**Solución esperada:** Deberíamos poder agregar nuevos enemigos sin modificar código existente.

---

### 3. ❌ Violación de ISP (Interface Segregation)

#### `types.ts` - Enemy Interface
```typescript
export interface Enemy extends GameObject {
    vx: number;
    vy: number;
    type: EnemyType;
    tile: string;
    direction?: number;        // Solo viper
    initialX?: number;         // Solo viper
    initialY?: number;         // Spider y bat
    maxLength?: number;        // Solo spider
    state?: string;            // Solo viper
    idleTimer?: number;        // Solo viper
    waitTimer?: number;        // Solo viper
    spriteTick: number;
    movementTick?: number;     // Solo bat
    currentFrame: number;
    // ...
}
```

**Problema:** Todos los enemigos usan la misma interfaz, pero cada tipo solo usa algunos campos. Esto es confuso y propenso a errores.

---

### 4. ❌ Violación de DIP (Dependency Inversion)

#### Acoplamiento Directo con GameStore
```typescript
// Todas las funciones dependen directamente del GameStore global
export const updatePlayer = (store: GameStore) => { /* ... */ }
export const updateEnemies = (store: GameStore) => { /* ... */ }
export const renderGame = (store: GameStore) => { /* ... */ }
```

**Problema:** 
- Todo está acoplado al store global
- Difícil de testear (necesitas el store completo)
- Difícil de reutilizar funciones
- No puedes cambiar la implementación del estado fácilmente

---

### 5. ❌ Falta de Abstracción en Renderizado

#### `render.ts`
```typescript
// Lógica de renderizado mezclada con lógica de negocio
const drawGameWorld = (store: GameStore) => {
    // Acceso directo a propiedades del store
    ctx.fillStyle = 'black';
    store.walls.forEach(wall => drawWall(store, wall));
    store.enemies.forEach(enemy => drawEnemy(store, enemy));
    // ...
}
```

**Problema:** El renderizador está fuertemente acoplado al store y conoce detalles de implementación.

---

## Plan de Refactorización

### Fase 1: Aplicar SRP - Separar Responsabilidades

#### 1.1 Separar `player.ts` en:
- `PlayerInputHandler.ts` - Manejo de input
- `PlayerPhysics.ts` - Física y movimiento
- `PlayerCollisionResolver.ts` - Resolución de colisiones
- `PlayerAnimator.ts` - Animaciones
- `Player.ts` - Clase principal que coordina

#### 1.2 Separar `main.ts` en:
- `Game.ts` - Clase principal del juego
- `GameLoop.ts` - Loop del juego
- `CameraController.ts` - Control de cámara

---

### Fase 2: Aplicar OCP - Sistema Extensible de Enemigos

#### 2.1 Crear jerarquía de enemigos:
```typescript
interface IEnemy {
    update(context: GameContext): void;
    render(renderer: Renderer): void;
}

class BatEnemy implements IEnemy { /* ... */ }
class SpiderEnemy implements IEnemy { /* ... */ }
class ViperEnemy implements IEnemy { /* ... */ }
```

---

### Fase 3: Aplicar ISP - Interfaces Segregadas

#### 3.1 Separar interfaces de enemigos:
```typescript
interface IMovable { /* ... */ }
interface IAnimatable { /* ... */ }
interface ICollidable { /* ... */ }

class BatEnemy implements IMovable, IAnimatable, ICollidable { /* ... */ }
```

---

### Fase 4: Aplicar DIP - Inyección de Dependencias

#### 4.1 Crear abstracciones:
```typescript
interface IGameState { /* ... */ }
interface IRenderer { /* ... */ }
interface IInputProvider { /* ... */ }

class Game {
    constructor(
        private state: IGameState,
        private renderer: IRenderer,
        private input: IInputProvider
    ) {}
}
```

---

### Fase 5: Aplicar LSP - Jerarquías Correctas

#### 5.1 Revisar herencias y usar composición donde sea apropiado

---

## Implementación

La implementación se realizará en archivos separados para mantener compatibilidad y poder comparar:

```
src/scripts/solid/
├── README.md
├── entities/
│   ├── Player/
│   │   ├── Player.ts
│   │   ├── PlayerInputHandler.ts
│   │   ├── PlayerPhysics.ts
│   │   ├── PlayerCollisionResolver.ts
│   │   └── PlayerAnimator.ts
│   └── enemies/
│       ├── IEnemy.ts
│       ├── BaseEnemy.ts
│       ├── BatEnemy.ts
│       ├── SpiderEnemy.ts
│       └── ViperEnemy.ts
├── systems/
│   ├── GameLoop.ts
│   ├── CameraController.ts
│   └── CollisionSystem.ts
├── services/
│   ├── IRenderer.ts
│   ├── CanvasRenderer.ts
│   ├── IGameState.ts
│   └── GameState.ts
└── Game.ts
```

---

## Beneficios de Aplicar SOLID

### 1. **Mantenibilidad**
- Código más fácil de entender
- Cambios localizados (no efecto dominó)
- Menos bugs al modificar

### 2. **Testabilidad**
- Componentes aislados fáciles de testear
- Puedes inyectar mocks/stubs
- Tests unitarios más simples

### 3. **Escalabilidad**
- Fácil agregar nuevas características
- Código reutilizable
- Extensible sin romper lo existente

### 4. **Colaboración**
- Código más profesional
- Estándares claros
- Fácil para nuevos desarrolladores

---

## Próximos Pasos

1. Crear estructura de carpetas `solid/`
2. Implementar Player siguiendo SRP
3. Implementar sistema de enemigos siguiendo OCP/ISP
4. Aplicar DIP con inyección de dependencias
5. Migrar gradualmente el código existente
6. Documentar cada decisión

---

**Nota:** Esta refactorización es educativa. El código original funciona, pero aplicando SOLID lo hacemos más profesional y mantenible. ¡Excelente ejercicio de aprendizaje! 🚀

