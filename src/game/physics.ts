// Importa la configuración general y la lista de obstáculos.
// CONFIG contiene velocidad máxima, aceleración, ancho de ruta y meta.
// OBSTACLES contiene posiciones y radios de los obstáculos.
import { CONFIG, OBSTACLES } from './config.ts';

// Define la estructura de los controles.
// Cada propiedad indica si una acción está activada.
export type Controls = {
  forward: boolean; // Acelerar.
  brake: boolean;   // Frenar.
  left: boolean;    // Girar a la izquierda.
  right: boolean;   // Girar a la derecha.
};

// Define los datos que representan una partida.
export type BikeState = {
  x: number;        // Posición lateral de la moto.
  z: number;        // Posición a lo largo del circuito.
  yaw: number;      // Ángulo de dirección, en radianes.
  speed: number;    // Velocidad, en unidades del mundo por segundo.
  time: number;     // Tiempo de simulación acumulado, en segundos.
  bumps: number;    // Cantidad de choques registrados.
  cooldown: number; // Tiempo restante antes de contar otro choque.
  won: boolean;    // Indica si la moto llegó a la meta.
};

// Función que crea un estado inicial nuevo.
// ": BikeState" establece el tipo de objeto que devuelve.
//
// Los paréntesis alrededor del objeto permiten devolverlo
// directamente desde una función flecha.
export const freshState = (): BikeState => ({
  x: 0,         // Comienza en el centro de la ruta.
  z: 5,         // Posición inicial sobre el recorrido.
  yaw: 0,       // Apunta hacia Z negativo, sin giro lateral.
  speed: 0,     // Comienza detenida.
  time: 0,      // Cronómetro en cero.
  bumps: 0,     // Ningún choque registrado.
  cooldown: 0, // Puede registrar un choque inmediatamente.
  won: false,  // Todavía no llegó a la meta.
});

// Calcula el siguiente estado de la partida.
//
// Es una función de simulación independiente de React y Three.js.
// No modifica el objeto state recibido: trabaja sobre una copia.
export function step(
  state: BikeState, // Estado actual.
  input: Controls, // Acciones activadas por teclado o botones táctiles.
  dt: number       // Tiempo transcurrido desde el frame anterior, en segundos.
): BikeState {
  // Si ya terminó la partida, devuelve el mismo estado sin modificarlo.
  if (state.won) return state;

  // Limita dt al rango de 0 a 0.05 segundos.
  //
  // Math.max(dt, 0): impide valores negativos.
  // Math.min(..., 0.05): limita el avance a 50 milisegundos.
  //
  // Evita movimientos enormes después de una interrupción.
  dt = Math.min(Math.max(dt, 0), 0.05);

  // Crea una copia superficial del estado anterior.
  // Como sus propiedades son valores simples, podemos modificarlas
  // en esta copia sin cambiar el objeto original.
  const s = {
    ...state,

    // Suma el tiempo de este paso al cronómetro.
    time: state.time + dt,

    // Reduce la espera entre choques, sin permitir valores negativos.
    cooldown: Math.max(0, state.cooldown - dt),
  };

  // Decide la aceleración que se aplicará.
  // Aunque la variable se llama force, aquí representa
  // directamente un cambio de velocidad por segundo.
  //
  // Prioridad:
  // 1. Si frena: desacelera a razón de 22 unidades/s².
  // 2. Si acelera: usa la aceleración configurada.
  // 3. Si no hace ninguna de las dos: desacelera suavemente.
  const force = input.brake
    ? -22
    : input.forward
      ? CONFIG.acceleration
      : -4;

  // Actualiza la velocidad:
  // nueva velocidad = velocidad anterior + aceleración × tiempo.
  //
  // Math.min evita superar la velocidad máxima.
  // Math.max evita una velocidad negativa: no hay marcha atrás.
  s.speed = Math.max(
    0,
    Math.min(
      CONFIG.maxSpeed,
      s.speed + force * dt
    )
  );

  // Convierte los booleanos a números:
  // Number(true) = 1.
  // Number(false) = 0.
  //
  // Izquierda solamente: 1 - 0 = 1.
  // Derecha solamente: 0 - 1 = -1.
  // Ninguna o ambas: resultado 0.
  const steering = Number(input.left) - Number(input.right);

  // Actualiza el ángulo de dirección.
  //
  // steering indica el sentido del giro.
  // 1.6 controla qué tan rápido gira.
  // dt hace que el giro dependa del tiempo, no de la cantidad de frames.
  // Math.min(1, s.speed / 3) reduce el giro a baja velocidad.
  //
  // Si la velocidad es 0, no gira.
  // Desde una velocidad de 3, aplica toda la capacidad de giro.
  //
  // Los Math.max y Math.min limitan el ángulo a ±0.92 radianes,
  // aproximadamente ±52.7 grados.
  s.yaw = Math.max(
    -0.92,
    Math.min(
      0.92,
      s.yaw + steering * 1.6 * dt * Math.min(1, s.speed / 3)
    )
  );

  // Si no hay una dirección de giro activa, endereza la moto.
  // !steering es verdadero cuando steering vale 0.
  if (!steering) {
    // Math.exp calcula una exponencial.
    // Para dt positivo, este factor queda entre 0 y 1.
    //
    // Multiplicar el ángulo por ese factor lo acerca suavemente a cero.
    // Un valor mayor que 2.6 produciría un retorno más rápido.
    s.yaw *= Math.exp(-2.6 * dt);
  }

  // Actualiza la posición lateral.
  //
  // Math.sin(yaw) obtiene la componente lateral de la dirección.
  // speed × dt es la distancia recorrida en este paso.
  // -= resta ese desplazamiento a la posición actual.
  //
  // En esta convención, un yaw positivo mueve la moto hacia X negativo.
  s.x -= Math.sin(s.yaw) * s.speed * dt;

  // Actualiza el avance por el circuito.
  //
  // Math.cos(yaw) obtiene la componente longitudinal.
  // Con yaw = 0, cos(0) = 1: avanza completamente hacia Z negativo.
  // Al girar, una parte del movimiento pasa al eje X.
  s.z -= Math.cos(s.yaw) * s.speed * dt;

  // Limita la posición lateral al ancho permitido de la ruta.
  //
  // Si roadHalfWidth es 8, el rango permitido es de -8 a 8.
  // Esto limita la posición, pero no cuenta como un choque.
  s.x = Math.max(
    -CONFIG.roadHalfWidth,
    Math.min(CONFIG.roadHalfWidth, s.x)
  );

  // Revisa cada obstáculo del circuito.
  for (const obstacle of OBSTACLES) {
    // Calcula la distancia entre la moto y el centro del obstáculo.
    //
    // Math.hypot(dx, dz) equivale a:
    // raíz cuadrada de (dx² + dz²).
    //
    // Si la distancia es menor que la suma de los radios,
    // considera que hay una colisión.
    // 0.55 es el radio aproximado asignado a la moto.
    if (
      Math.hypot(
        s.x - obstacle.x,
        s.z - obstacle.z
      ) < obstacle.radius + 0.55
    ) {
      // Recupera la posición lateral anterior al movimiento.
      s.x = state.x;

      // Recupera la posición longitudinal anterior.
      s.z = state.z;

      // Detiene la moto.
      s.speed = 0;

      // Cuenta el choque solamente si terminó el período de espera.
      if (s.cooldown === 0) {
        // ++ incrementa la cantidad de choques en uno.
        s.bumps++;

        // Espera 0.8 segundos antes de poder contar otro choque.
        // Durante esa espera, las colisiones siguen deteniendo la moto.
        s.cooldown = 0.8;
      }

      // Aparta la moto lateralmente para que pueda seguir avanzando.
      //
      // Si estaba a la derecha del centro del obstáculo, usa +1.
      // Si estaba a la izquierda, usa -1.
      //
      // obstacle.radius + 0.65 deja un margen alrededor del obstáculo.
      //
      // Los límites -8 y 8 están escritos directamente en este código.
      s.x = Math.max(
        -8,
        Math.min(
          8,
          obstacle.x +
            (s.x >= obstacle.x ? 1 : -1) *
            (obstacle.radius + 0.65)
        )
      );

      // Deja de revisar obstáculos en este paso.
      // Solo resuelve la primera colisión encontrada.
      break;
    }
  }

  // Comprueba si alcanzó o cruzó la coordenada de la meta.
  // Se usa <= porque la moto avanza hacia valores Z más negativos.
  if (s.z <= CONFIG.finishZ) {
    // Marca la partida como terminada.
    s.won = true;

    // Detiene la moto al cruzar.
    s.speed = 0;
  }

  // Devuelve el estado actualizado.
  // GameCanvas lo usará para colocar y orientar el modelo 3D.
  return s;
}

// Calcula el avance hacia la meta como un valor entre 0 y 1.
export const distanceProgress = (s: BikeState) =>
  Math.min(
    1, // Impide que el progreso supere el 100%.

    Math.max(
      0, // Impide que el progreso sea negativo.

      // Distancia recorrida / distancia total.
      //
      // 5 es la posición Z inicial de la moto.
      // 5 - s.z calcula cuánto avanzó.
      // 5 - CONFIG.finishZ calcula la longitud total del recorrido.
      //
      // Al comenzar: 0.
      // A mitad de camino: aproximadamente 0.5.
      // Al llegar a la meta: 1.
      (5 - s.z) / (5 - CONFIG.finishZ)
    )
  );
