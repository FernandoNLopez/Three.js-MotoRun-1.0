// Importa las herramientas de comprobación incluidas en Node.js.
// No hace falta instalar una dependencia adicional.
// La versión strict utiliza comparaciones estrictas.
import assert from 'node:assert/strict';

// Importa las funciones de la simulación que vamos a probar.
import {
  freshState,
  step,
  distanceProgress,
} from '../src/game/physics.ts';

// Importa la configuración y los obstáculos del circuito.
import { CONFIG, OBSTACLES } from '../src/game/config.ts';

// Controles que representan acelerar sin frenar ni girar.
const gas = {
  forward: true,
  brake: false,
  left: false,
  right: false,
};

// ----------------------------------------------------
// PRUEBA 1: ACELERACIÓN Y AVANCE
// ----------------------------------------------------

// Crea una partida en su estado inicial.
// Usamos let porque vamos a reemplazar este estado varias veces.
let s = freshState();

// Simula 60 pasos de 1/60 de segundo.
// En total representa un segundo de juego.
for (let i = 0; i < 60; i++) {
  // Calcula el siguiente estado mientras mantenemos el acelerador.
  s = step(s, gas, 1 / 60);
}

// Comprueba que avanzó desde su posición inicial Z = 5.
// La moto avanza hacia valores Z más negativos.
assert.ok(s.z < 5);

// Comprueba que adquirió una velocidad positiva.
assert.ok(s.speed > 0);

// ----------------------------------------------------
// PRUEBA 2: FRENADO
// ----------------------------------------------------

// Guarda la velocidad antes de aplicar el freno.
const before = s.speed;

// Simula 0.05 segundos con el freno activado.
// ...gas copia los controles anteriores.
// brake: true reemplaza la propiedad brake.
//
// Aunque forward sigue siendo true, physics.ts da prioridad al freno.
s = step(
  s,
  { ...gas, brake: true },
  0.05
);

// Comprueba que la velocidad disminuyó.
assert.ok(s.speed < before);

// ----------------------------------------------------
// PRUEBA 3: GIRO A LA IZQUIERDA
// ----------------------------------------------------

// Crea un estado inicial con velocidad 10.
// Activa aceleración y giro hacia la izquierda.
// Simula 0.05 segundos.
const left = step(
  {
    ...freshState(),
    speed: 10,
  },
  {
    ...gas,
    left: true,
  },
  0.05
);

// Comprueba que se desplazó hacia X negativo,
// que corresponde a la izquierda en esta simulación.
assert.ok(left.x < 0);

// ----------------------------------------------------
// PRUEBA 4: COLISIÓN Y RECUPERACIÓN
// ----------------------------------------------------

// Selecciona el primer obstáculo del circuito.
// Esta prueba presupone que OBSTACLES contiene al menos un elemento.
const o = OBSTACLES[0];

// Coloca la moto cerca del obstáculo y avanzando hacia él.
const collision = step(
  {
    ...freshState(),

    // Alinea la moto lateralmente con el centro del obstáculo.
    x: o.x,

    // La sitúa antes del obstáculo sobre el eje Z.
    // El margen inicial permite que el siguiente movimiento provoque el choque.
    z: o.z + o.radius + 0.6,

    // Le da velocidad suficiente para acercarse en este paso.
    speed: 17,
  },
  gas,
  0.05
);

// Comprueba que se registró exactamente un choque.
assert.equal(collision.bumps, 1);

// Comprueba que el choque detuvo la moto.
assert.equal(collision.speed, 0);

// Comprueba que la recuperación la dejó fuera del área de colisión.
//
// Math.hypot calcula la distancia entre los centros.
// o.radius es el radio del obstáculo.
// 0.55 es el radio aproximado de la moto.
assert.ok(
  Math.hypot(
    collision.x - o.x,
    collision.z - o.z
  ) > o.radius + 0.55
);

// ----------------------------------------------------
// PRUEBA 5: LLEGADA A LA META
// ----------------------------------------------------

// Coloca la moto justo antes de la meta y con velocidad.
const win = step(
  {
    ...freshState(),

    // Usa un lateral del circuito sin obstáculos en esta configuración.
    x: 6,

    // La coloca 0.01 unidades antes de la meta.
    z: CONFIG.finishZ + 0.01,

    speed: 10,
  },
  gas,
  0.05
);

// Comprueba que se marcó la victoria.
assert.equal(win.won, true);

// Comprueba que el progreso alcanzó 1, equivalente al 100%.
assert.equal(distanceProgress(win), 1);

// Intenta avanzar otra vez después de terminar.
// deepEqual compara el contenido de los estados.
// Comprueba que la simulación no cambia los datos tras ganar.
assert.deepEqual(
  step(win, gas, 0.05),
  win
);

// ----------------------------------------------------
// PRUEBA 6: RECORRIDO COMPLETO SIN CHOQUES
// ----------------------------------------------------

// Comienza otra partida, desplazada hacia el lado derecho.
// Con los obstáculos actuales, X = 6 permite pasar sin chocar.
s = {
  ...freshState(),
  x: 6,
};

// Simula hasta 1200 pasos de 1/60 de segundo: como máximo, 20 segundos.
//
// El bucle continúa mientras:
// 1. No haya alcanzado los 1200 pasos.
// 2. La moto todavía no haya ganado.
for (let i = 0; i < 1200 && !s.won; i++) {
  // Mantiene el acelerador sin girar.
  s = step(s, gas, 1 / 60);
}

// Comprueba que pudo completar el circuito dentro del límite.
assert.ok(s.won);

// Comprueba que ese recorrido no produjo choques.
assert.equal(s.bumps, 0);

// ----------------------------------------------------
// PRUEBA 7: LÍMITE LATERAL DE LA RUTA
// ----------------------------------------------------

// Coloca la moto en el borde derecho y orientada hacia afuera.
const bounded = step(
  {
    ...freshState(),

    // Borde derecho de la ruta en la configuración actual.
    x: 8,

    // Un ángulo negativo dirige el movimiento hacia X positivo.
    yaw: -0.9,

    speed: 17,
  },
  gas,
  0.05
);

// Comprueba que el movimiento no superó X = 8.
// Esta prueba verifica solamente el límite derecho.
assert.ok(bounded.x <= 8);

// Este mensaje se ejecuta únicamente si ninguna comprobación falló.
console.log(
  'Passed: acceleration, braking, steering, collision recovery, finish, complete ride, road bounds.'
);// Importa las herramientas de comprobación incluidas en Node.js.
// No hace falta instalar una dependencia adicional.
// La versión strict utiliza comparaciones estrictas.
import assert from 'node:assert/strict';

// Importa las funciones de la simulación que vamos a probar.
import {
  freshState,
  step,
  distanceProgress,
} from '../src/game/physics.ts';

// Importa la configuración y los obstáculos del circuito.
import { CONFIG, OBSTACLES } from '../src/game/config.ts';

// Controles que representan acelerar sin frenar ni girar.
const gas = {
  forward: true,
  brake: false,
  left: false,
  right: false,
};

// ----------------------------------------------------
// PRUEBA 1: ACELERACIÓN Y AVANCE
// ----------------------------------------------------

// Crea una partida en su estado inicial.
// Usamos let porque vamos a reemplazar este estado varias veces.
let s = freshState();

// Simula 60 pasos de 1/60 de segundo.
// En total representa un segundo de juego.
for (let i = 0; i < 60; i++) {
  // Calcula el siguiente estado mientras mantenemos el acelerador.
  s = step(s, gas, 1 / 60);
}

// Comprueba que avanzó desde su posición inicial Z = 5.
// La moto avanza hacia valores Z más negativos.
assert.ok(s.z < 5);

// Comprueba que adquirió una velocidad positiva.
assert.ok(s.speed > 0);

// ----------------------------------------------------
// PRUEBA 2: FRENADO
// ----------------------------------------------------

// Guarda la velocidad antes de aplicar el freno.
const before = s.speed;

// Simula 0.05 segundos con el freno activado.
// ...gas copia los controles anteriores.
// brake: true reemplaza la propiedad brake.
//
// Aunque forward sigue siendo true, physics.ts da prioridad al freno.
s = step(
  s,
  { ...gas, brake: true },
  0.05
);

// Comprueba que la velocidad disminuyó.
assert.ok(s.speed < before);

// ----------------------------------------------------
// PRUEBA 3: GIRO A LA IZQUIERDA
// ----------------------------------------------------

// Crea un estado inicial con velocidad 10.
// Activa aceleración y giro hacia la izquierda.
// Simula 0.05 segundos.
const left = step(
  {
    ...freshState(),
    speed: 10,
  },
  {
    ...gas,
    left: true,
  },
  0.05
);

// Comprueba que se desplazó hacia X negativo,
// que corresponde a la izquierda en esta simulación.
assert.ok(left.x < 0);

// ----------------------------------------------------
// PRUEBA 4: COLISIÓN Y RECUPERACIÓN
// ----------------------------------------------------

// Selecciona el primer obstáculo del circuito.
// Esta prueba presupone que OBSTACLES contiene al menos un elemento.
const o = OBSTACLES[0];

// Coloca la moto cerca del obstáculo y avanzando hacia él.
const collision = step(
  {
    ...freshState(),

    // Alinea la moto lateralmente con el centro del obstáculo.
    x: o.x,

    // La sitúa antes del obstáculo sobre el eje Z.
    // El margen inicial permite que el siguiente movimiento provoque el choque.
    z: o.z + o.radius + 0.6,

    // Le da velocidad suficiente para acercarse en este paso.
    speed: 17,
  },
  gas,
  0.05
);

// Comprueba que se registró exactamente un choque.
assert.equal(collision.bumps, 1);

// Comprueba que el choque detuvo la moto.
assert.equal(collision.speed, 0);

// Comprueba que la recuperación la dejó fuera del área de colisión.
//
// Math.hypot calcula la distancia entre los centros.
// o.radius es el radio del obstáculo.
// 0.55 es el radio aproximado de la moto.
assert.ok(
  Math.hypot(
    collision.x - o.x,
    collision.z - o.z
  ) > o.radius + 0.55
);

// ----------------------------------------------------
// PRUEBA 5: LLEGADA A LA META
// ----------------------------------------------------

// Coloca la moto justo antes de la meta y con velocidad.
const win = step(
  {
    ...freshState(),

    // Usa un lateral del circuito sin obstáculos en esta configuración.
    x: 6,

    // La coloca 0.01 unidades antes de la meta.
    z: CONFIG.finishZ + 0.01,

    speed: 10,
  },
  gas,
  0.05
);

// Comprueba que se marcó la victoria.
assert.equal(win.won, true);

// Comprueba que el progreso alcanzó 1, equivalente al 100%.
assert.equal(distanceProgress(win), 1);

// Intenta avanzar otra vez después de terminar.
// deepEqual compara el contenido de los estados.
// Comprueba que la simulación no cambia los datos tras ganar.
assert.deepEqual(
  step(win, gas, 0.05),
  win
);

// ----------------------------------------------------
// PRUEBA 6: RECORRIDO COMPLETO SIN CHOQUES
// ----------------------------------------------------

// Comienza otra partida, desplazada hacia el lado derecho.
// Con los obstáculos actuales, X = 6 permite pasar sin chocar.
s = {
  ...freshState(),
  x: 6,
};

// Simula hasta 1200 pasos de 1/60 de segundo: como máximo, 20 segundos.
//
// El bucle continúa mientras:
// 1. No haya alcanzado los 1200 pasos.
// 2. La moto todavía no haya ganado.
for (let i = 0; i < 1200 && !s.won; i++) {
  // Mantiene el acelerador sin girar.
  s = step(s, gas, 1 / 60);
}

// Comprueba que pudo completar el circuito dentro del límite.
assert.ok(s.won);

// Comprueba que ese recorrido no produjo choques.
assert.equal(s.bumps, 0);

// ----------------------------------------------------
// PRUEBA 7: LÍMITE LATERAL DE LA RUTA
// ----------------------------------------------------

// Coloca la moto en el borde derecho y orientada hacia afuera.
const bounded = step(
  {
    ...freshState(),

    // Borde derecho de la ruta en la configuración actual.
    x: 8,

    // Un ángulo negativo dirige el movimiento hacia X positivo.
    yaw: -0.9,

    speed: 17,
  },
  gas,
  0.05
);

// Comprueba que el movimiento no superó X = 8.
// Esta prueba verifica solamente el límite derecho.
assert.ok(bounded.x <= 8);

// Este mensaje se ejecuta únicamente si ninguna comprobación falló.
console.log(
  'Passed: acceleration, braking, steering, collision recovery, finish, complete ride, road bounds.'
);