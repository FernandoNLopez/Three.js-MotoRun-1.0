// useEffect: inicializa el juego y limpia sus recursos al desmontarlo.
// useRef: conserva referencias entre renderizados sin actualizar la interfaz.
// useState: guarda el estado del mensaje de error.
import { useEffect, useRef, useState } from 'react';

// Importa Three.js completo bajo el alias T.
// Por ejemplo, T.Scene equivale a THREE.Scene.
import * as T from 'three';

// Función que construye el modelo de la moto y devuelve sus piezas.
import { makeBike } from './game/models';

// Función que agrega el suelo, árboles, obstáculos y meta a la escena.
import { createWorld } from './game/world';

// freshState: crea el estado inicial de la partida.
// step: calcula el siguiente estado según controles y tiempo transcurrido.
// distanceProgress: calcula el avance hacia la meta.
// Controls y BikeState: tipos utilizados para comprobar los datos.
//
// Nota: distanceProgress está importada, pero no se usa en este archivo.
import {
  freshState,
  step,
  distanceProgress,
  type Controls,
  type BikeState,
} from './game/physics';

// Define los únicos modos permitidos.
// Se exporta para que App.tsx también pueda usar este tipo.
export type Mode = 'ready' | 'running' | 'paused' | 'finished';

// Describe las propiedades que App debe enviar a GameCanvas.
type Props = {
  // Estado actual del juego.
  mode: Mode;

  // Contador: cuando cambia, solicita reiniciar la simulación.
  restart: number;

  // Estado de los botones táctiles.
  touch: Controls;

  // Función que recibe estadísticas actualizadas.
  // "void" indica que no esperamos un valor de retorno.
  onUpdate: (s: BikeState) => void;

  // Función que se ejecuta cuando se cruza la meta.
  onFinish: (s: BikeState) => void;

  // Función que solicita pausar la partida.
  onPause: () => void;
};

// Componente que recibe las propiedades definidas en Props.
export default function GameCanvas(props: Props) {
  // Guarda una referencia al div donde insertaremos el canvas de Three.js.
  // Inicialmente es null porque React todavía no creó el elemento.
  const host = useRef<HTMLDivElement>(null);

  // Guarda las propiedades más recientes para el ciclo de animación.
  // Cambiar este ref no provoca un renderizado de React.
  const inputs = useRef(props);

  // Actualiza la referencia cada vez que React ejecuta el componente.
  // Así, el ciclo de Three.js puede leer los controles y callbacks actuales.
  inputs.current = props;

  // Indica si falló la creación del renderizador WebGL.
  const [error, setError] = useState(false);

  // Inicializa Three.js después de que React creó el div.
  useEffect(() => {
    // Obtiene el elemento HTML guardado en el ref.
    // "!" le dice a TypeScript que asumimos que no es null.
    // No realiza una comprobación real en tiempo de ejecución.
    const container = host.current!;

    // Declara el renderizador; lo crearemos dentro del try.
    let renderer: T.WebGLRenderer;

    try {
      // Crea el motor que dibuja la escena utilizando WebGL.
      // antialias suaviza los bordes de los objetos.
      renderer = new T.WebGLRenderer({
        antialias: true,
      });
    } catch {
      // Si no puede crear WebGL, activa el mensaje de error.
      setError(true);

      // Sale del efecto para evitar usar un renderer inexistente.
      return;
    }

    // Ajusta la resolución según la densidad de píxeles de la pantalla.
    // La limita a 1.5 para reducir el trabajo gráfico en pantallas densas.
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

    // Habilita el cálculo de sombras.
    renderer.shadowMap.enabled = true;

    // Selecciona un filtrado que suaviza los bordes de las sombras.
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    // Define el color de fondo del canvas.
    renderer.setClearColor('#eddcbe');

    // Aplica un mapeo tonal para representar mejor luces y colores intensos.
    renderer.toneMapping = T.ACESFilmicToneMapping;

    // Ajusta la exposición del mapeo tonal.
    renderer.toneMappingExposure = 1.15;

    // Inserta el canvas que creó Three.js dentro del div de React.
    container.appendChild(renderer.domElement);

    // Crea la escena: contiene los objetos, luces y entorno.
    const scene = new T.Scene();

    // Agrega niebla del mismo color que el fondo.
    // Comienza a 55 unidades de distancia y llega al máximo a 120.
    scene.fog = new T.Fog('#eddcbe', 55, 120);

    // Crea una cámara ortográfica.
    // Los objetos no se achican por estar más lejos, como en perspectiva.
    //
    // Parámetros:
    // izquierda, derecha, arriba, abajo, plano cercano y plano lejano.
    // Los límites laterales se ajustarán luego en resize().
    const camera = new T.OrthographicCamera(
      -18,
      18,
      18,
      -18,
      0.1,
      200
    );

    // Agrega iluminación ambiental de dos colores:
    // primer color: luz desde el cielo.
    // segundo color: luz desde el suelo.
    // 2.5: intensidad.
    scene.add(
      new T.HemisphereLight('#fff6de', '#91816b', 2.5)
    );

    // Crea una luz direccional que representa el sol.
    // El segundo parámetro indica su intensidad.
    const sunlight = new T.DirectionalLight('#fff6db', 3);

    // Permite que esta luz genere sombras.
    sunlight.castShadow = true;

    // Define la resolución de la textura usada para calcular las sombras.
    sunlight.shadow.mapSize.set(1024, 1024);

    // Ajusta la cámara interna que determina dónde se calculan las sombras.
    // Object.assign copia estas propiedades al objeto existente.
    Object.assign(sunlight.shadow.camera, {
      left: -32,
      right: 32,
      top: 32,
      bottom: -32,
      near: 1,
      far: 95,
    });

    // Desplaza ligeramente las muestras de sombra según la superficie.
    // Ayuda a reducir marcas incorrectas de autosombreado.
    sunlight.shadow.normalBias = 0.04;

    // Agrega la luz a la escena.
    scene.add(sunlight);

    // Agrega también el objetivo hacia el que apunta la luz.
    // Su posición se actualizará mientras avanza la moto.
    scene.add(sunlight.target);

    // Construye y agrega los elementos del escenario.
    createWorld(scene);

    // Construye la moto.
    // Devuelve un grupo principal y una colección de ruedas.
    const bike = makeBike();

    // Agrega el grupo completo de la moto a la escena.
    scene.add(bike.group);

    // Set guarda las teclas presionadas sin valores duplicados.
    const keys = new Set<string>();

    // Función que registra una tecla presionada.
    const handleKey = (e: KeyboardEvent) => {
      // Identifica flechas y barra espaciadora.
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          ' ',
        ].includes(e.key)
      ) {
        // Evita acciones del navegador, como desplazar la página.
        e.preventDefault();
      }

      // Guarda la tecla en minúsculas.
      // Ejemplo: "ArrowUp" se guarda como "arrowup".
      keys.add(e.key.toLowerCase());
    };

    // Cuando se suelta una tecla, la elimina del conjunto.
    const up = (e: KeyboardEvent) =>
      keys.delete(e.key.toLowerCase());

    // Se ejecuta cuando la ventana pierde el foco.
    const blur = () => {
      // Limpia las teclas para evitar que queden "presionadas".
      keys.clear();

      // Si la partida estaba en ejecución, solicita pausarla.
      if (inputs.current.mode === 'running') {
        inputs.current.onPause();
      }
    };

    // Escucha cuándo se presiona una tecla.
    window.addEventListener('keydown', handleKey);

    // Escucha cuándo se libera una tecla.
    window.addEventListener('keyup', up);

    // Escucha cuándo la ventana pierde el foco.
    window.addEventListener('blur', blur);

    // Ajusta el renderizador y la cámara al tamaño del contenedor.
    const resize = () => {
      // Obtiene ancho y alto disponibles, en píxeles CSS.
      const w = container.clientWidth;
      const h = container.clientHeight;

      // Actualiza el tamaño del canvas.
      renderer.setSize(w, h);

      // Selecciona la mitad de la altura visible en unidades del mundo.
      // Un valor menor muestra menos escenario: funciona como acercamiento.
      const half = w < 650 ? 14 : 17;

      // Ajusta el ancho visible usando la proporción de la pantalla.
      // Esto evita deformar los objetos.
      camera.left = (-half * w) / h;
      camera.right = (half * w) / h;

      // Ajusta los límites verticales.
      camera.top = half;
      camera.bottom = -half;

      // Recalcula la proyección después de modificar la cámara.
      camera.updateProjectionMatrix();
    };

    // Observa cambios de tamaño del div, no solamente de la ventana.
    const observer = new ResizeObserver(resize);

    // Comienza a observar el contenedor.
    observer.observe(container);

    // Aplica el tamaño correcto inmediatamente.
    resize();

    // Estado de la simulación, independiente del estado React.
    let state = freshState();

    // Guarda el instante del frame anterior, en milisegundos.
    let last = 0;

    // Guarda cuándo se enviaron estadísticas al HUD por última vez.
    let lastHud = 0;

    // Guarda el contador de reinicio que ya procesó la simulación.
    let version = inputs.current.restart;

    // Vector reutilizable que indica hacia dónde mira la cámara.
    const camTarget = new T.Vector3();

    // Registra la función que Three.js ejecutará en cada frame.
    // "now" es el tiempo recibido del ciclo de animación, en milisegundos.
    renderer.setAnimationLoop((now) => {
      // Calcula el tiempo transcurrido desde el frame anterior.
      // Divide por 1000 para convertirlo a segundos.
      // Lo limita a 0.05 segundos para evitar saltos grandes.
      const dt = Math.min((now - last) / 1000, 0.05);

      // Guarda el instante actual para el próximo frame.
      last = now;

      // Lee las propiedades más recientes enviadas por React.
      const p = inputs.current;

      // Si cambió el contador, hay una solicitud de reinicio.
      if (version !== p.restart) {
        // Restablece los datos de la simulación.
        state = freshState();

        // Marca este reinicio como procesado.
        version = p.restart;

        // Borra las teclas que estaban presionadas.
        keys.clear();

        // Informa a React el estado inicial.
        p.onUpdate(state);
      }

      // Solo calcula movimiento y colisiones durante la partida.
      if (p.mode === 'running') {
        // Combina controles del teclado con los botones táctiles.
        // || significa que alcanza con que una opción esté activa.
        const controls = {
          // Acelera con W, flecha arriba o botón táctil.
          forward:
            keys.has('w') ||
            keys.has('arrowup') ||
            p.touch.forward,

          // Frena con S, flecha abajo, espacio o botón táctil.
          brake:
            keys.has('s') ||
            keys.has('arrowdown') ||
            keys.has(' ') ||
            p.touch.brake,

          // Gira a la izquierda con A, flecha izquierda o botón táctil.
          left:
            keys.has('a') ||
            keys.has('arrowleft') ||
            p.touch.left,

          // Gira a la derecha con D, flecha derecha o botón táctil.
          right:
            keys.has('d') ||
            keys.has('arrowright') ||
            p.touch.right,
        };

        // Conserva el estado anterior para detectar la llegada a la meta.
        // Esto funciona porque step devuelve un estado nuevo.
        const previous = state;

        // Calcula velocidad, posición, dirección, choques y victoria.
        state = step(state, controls, dt);

        // Detecta el cambio de "todavía no ganó" a "ganó".
        // Así evita ejecutar onFinish repetidamente.
        if (state.won && !previous.won) {
          // Envía las estadísticas finales.
          p.onUpdate(state);

          // Avisa a App que debe mostrar la pantalla final.
          p.onFinish(state);
        }
      }

      // Coloca el modelo 3D en la posición calculada por la simulación.
      // Y queda fija en 0.03, ligeramente por encima del suelo.
      bike.group.position.set(state.x, 0.03, state.z);

      // Rota la moto sobre el eje vertical según su dirección.
      // yaw es un ángulo expresado en radianes.
      bike.group.rotation.y = state.yaw;

      // Inclina visualmente la moto según el giro y la velocidad.
      // lerp acerca el valor actual al deseado un 12% por frame.
      bike.group.rotation.z = T.MathUtils.lerp(
        bike.group.rotation.z,
        Math.sin(state.yaw) * state.speed * 0.018,
        0.12
      );

      // Rota las ruedas para simular que están rodando.
      // La cantidad depende de la velocidad y del tiempo transcurrido.
      for (const wheel of bike.wheels) {
        wheel.rotation.x -= state.speed * dt * 2;
      }

      // Calcula la posición deseada de la cámara:
      // X: sigue parcialmente a la moto, con un desplazamiento lateral.
      // Y: altura fija de 20 unidades.
      // Z: se mantiene 23 unidades detrás de la moto.
      const target = new T.Vector3(
        state.x * 0.35 + 15,
        20,
        state.z + 23
      );

      // Mueve la cámara suavemente hacia su posición deseada.
      // Al inicio usa 1 para ubicarla directamente.
      // Luego usa un factor basado en dt para suavizar el seguimiento.
      camera.position.lerp(
        target,
        lastHud === 0 ? 1 : 1 - Math.exp(-5 * dt)
      );

      // Define el punto que la cámara observa.
      // Mira un poco por delante de la moto: z - 5.
      camTarget.set(state.x * 0.25, 0, state.z - 5);

      // Orienta la cámara hacia ese punto.
      camera.lookAt(camTarget);

      // Desplaza la luz junto con la moto.
      // Esto mantiene la zona de sombras cerca del jugador.
      sunlight.position.set(
        state.x - 18,
        32,
        state.z + 12
      );

      // Actualiza también el punto hacia el que apunta la luz.
      sunlight.target.position.set(
        state.x,
        0,
        state.z - 10
      );

      // Envía estadísticas aproximadamente cada 100 milisegundos.
      // Evita actualizar React en todos los frames.
      if (now - lastHud > 100) {
        // Crea una copia superficial del estado y la envía a App.
        p.onUpdate({ ...state });

        // Guarda cuándo ocurrió esta actualización.
        lastHud = now;
      }

      // Dibuja la escena usando la cámara actual.
      // Sigue dibujando incluso si la simulación está pausada.
      renderer.render(scene, camera);
    });

    // React ejecuta esta función cuando desmonta el componente.
    // También permite limpiar un montaje de prueba de StrictMode.
    return () => {
      // Detiene el ciclo de animación.
      renderer.setAnimationLoop(null);

      // Deja de observar cambios de tamaño.
      observer.disconnect();

      // Elimina los eventos de teclado y foco.
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);

      // Recorre los objetos de la escena, incluidos los de sus grupos.
      scene.traverse((o) => {
        // Procesa únicamente objetos que sean mallas.
        // Una Mesh combina geometría y material.
        if (o instanceof T.Mesh) {
          // Libera los recursos gráficos de su geometría.
          o.geometry.dispose();

          // Una malla puede tener un material o un array de materiales.
          // Convertimos ambos casos a una colección iterable.
          const meshMaterials = Array.isArray(o.material)
            ? o.material
            : [o.material];

          // Recorre los materiales de esta malla.
          for (const m of meshMaterials) {
            // Comprueba si el material tiene una textura en su propiedad map.
            if ('map' in m && m.map instanceof T.Texture) {
              // Libera esa textura.
              m.map.dispose();
            }

            // Libera los recursos gráficos del material.
            m.dispose();
          }
        }
      });

      // Libera los recursos internos del renderizador.
      renderer.dispose();

      // Quita el canvas del documento HTML.
      renderer.domElement.remove();
    };

    // Inicializa la escena una vez por montaje.
    // Las props nuevas se leen mediante inputs.current.
  }, []);

  // React crea este contenedor; Three.js inserta su canvas dentro.
  return (
    <div
      // Conecta el elemento HTML con el ref host.
      ref={host}

      // Clase usada para posicionar y dimensionar el escenario.
      className="game-canvas"

      // Presenta el contenido como una imagen ante tecnologías de asistencia.
      role="img"

      // Descripción accesible del escenario.
      aria-label="A low-poly motorcycle on a scenic road with trees, cones, rocks and a finish line"
    >
      {/* Muestra este contenido solamente si falló la creación de WebGL. */}
      {error && (
        <div className="webgl-error">
          <h2>This ride needs WebGL.</h2>

          <p>
            Try a browser with hardware acceleration enabled.
          </p>
        </div>
      )}
    </div>
  );
}