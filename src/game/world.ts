// Importa Three.js utilizando T como alias.
import * as T from 'three';

// Importa las funciones y materiales definidos en models.ts.
// box: crea una caja.
// mesh: crea una malla y la agrega al padre.
// materials: colección de materiales reutilizables.
// tree: construye un árbol.
// sign: construye un cartel con texto.
import { box, mesh, materials, tree, sign } from './models';

// CONFIG contiene la configuración general, incluida la posición de la meta.
// OBSTACLES contiene los obstáculos y sus posiciones.
import { CONFIG, OBSTACLES } from './config';

// Construye el mundo dentro de la escena recibida.
// No devuelve un objeto: agrega las piezas directamente a scene.
export function createWorld(scene: T.Scene) {
  // Crea el suelo general del escenario.
  const ground = mesh(
    // Plano de 700 × 700 unidades.
    new T.PlaneGeometry(700, 700),

    // Material de color arena, con superficie muy rugosa.
    new T.MeshStandardMaterial({
      color: '#ddc6a0',
      roughness: 1,
    }),

    // Agrega la malla directamente a la escena.
    scene,

    // Posición del centro del plano.
    0,
    -0.05, // Ligeramente por debajo de la ruta.
    -65
  );

  // Un plano se crea inicialmente sobre los ejes X e Y.
  // Lo gira -90° alrededor de X para acostarlo sobre X y Z.
  ground.rotation.x = -Math.PI / 2;

  // Evita que el suelo proyecte sombras.
  // Sigue recibiéndolas porque mesh activa receiveShadow.
  ground.castShadow = false;

  // Crea la superficie de la ruta como una caja muy delgada.
  box(
    scene,

    // Ancho en X, altura en Y y longitud en Z.
    [17, 0.09, 174],

    // Material de arena más clara para distinguir la ruta.
    new T.MeshStandardMaterial({
      color: '#e9d9b9',
      roughness: 1,
    }),

    // Posición del centro de la ruta.
    0,
    0,
    -72
  );

  // Construye marcas discontinuas en ambos bordes de la ruta.
  //
  // Comienza en z = 8.
  // Continúa mientras z sea mayor que -157.
  // En cada vuelta avanza 6 unidades hacia Z negativo.
  for (let z = 8; z > -157; z -= 6) {
    // Marca del borde izquierdo.
    box(
      scene,
      [0.18, 0.04, 2.6],
      materials.cream,
      -8.3,
      0.06,
      z
    );

    // Marca del borde derecho.
    box(
      scene,
      [0.18, 0.04, 2.6],
      materials.cream,
      8.3,
      0.06,
      z
    );
  }

  // Construye las marcas discontinuas del centro de la ruta.
  // Cada marca está separada 8 unidades de la siguiente.
  for (let z = 3; z > -145; z -= 8) {
    box(
      scene,
      [0.15, 0.03, 2.2],
      materials.cream,
      0,    // Centrada sobre X.
      0.07, // Elevada ligeramente sobre la ruta.
      z
    );
  }

    // Reparte árboles y rocas, dejando libres los carteles.
  for (let i = 0; i < 45; i++) {
    const z = 15 - i * 4.2;

    const leftX = -12 - Math.sin(i * 7) * 3;
    const rightX = 13 + Math.cos(i * 5) * 3;
    const rightZ = z - 3;

    // Carteles de la izquierda: bienvenida y profesión.
    const nearLeftSign = [-9, -78].some(
      signZ => Math.abs(z - signZ) < 9
    );

    // Carteles de la derecha: nombre y tecnologías.
    const nearRightSign = [-42, -112].some(
      signZ => Math.abs(rightZ - signZ) < 9
    );

    if (!nearLeftSign) {
      tree(
        scene,
        leftX,
        z,
        0.7 + (i % 4) * 0.18
      );
    }

    if (i % 2 === 0 && !nearRightSign) {
      tree(
        scene,
        rightX,
        rightZ,
        0.9 + (i % 3) * 0.15
      );
    }

    // Conserva las rocas decorativas.
    if (i % 3 === 0) {
      const rock = mesh(
        new T.DodecahedronGeometry(1, 0),
        materials.stone,
        scene,
        11 + (i % 4),
        0.55,
        z
      );

      rock.scale.set(1.6, 0.8, 1.2);
    }
  }

  // Construye los modelos visibles de los obstáculos configurados.
  // La detección de colisiones se realiza aparte, en physics.ts.
  for (const o of OBSTACLES) {
    // Si el tipo de obstáculo es una roca...
    if (o.kind === 'rock') {
      const rock = mesh(
        // Usa el radio configurado para crear la geometría.
        new T.DodecahedronGeometry(o.radius, 0),

        materials.stone,
        scene,

        // Coloca la roca en las coordenadas del obstáculo.
        o.x,
        0.65,
        o.z
      );

      // Reduce su altura un 10%.
      rock.scale.set(1, 0.9, 1);

      // Aplica rotaciones sobre X, Y y Z.
      // Aquí o.z también se usa como ángulo en radianes
      // para dar orientaciones diferentes a las rocas.
      rock.rotation.set(0.2, o.z, 0.1);
    }

    // Si el obstáculo es una caja...
    if (o.kind === 'crate') {
      // Cuerpo principal de madera.
      box(
        scene,
        [1.65, 1.65, 1.65],
        materials.wood,
        o.x,
        0.86,
        o.z
      );

      // Franja horizontal clara alrededor de la caja.
      box(
        scene,
        [1.72, 0.15, 1.72],
        materials.cream,
        o.x,
        1.26,
        o.z
      );

      // Franja vertical clara.
      box(
        scene,
        [0.16, 1.7, 1.72],
        materials.cream,
        o.x,
        0.86,
        o.z
      );
    }

    // Si el obstáculo es un cono de tránsito...
    if (o.kind === 'cone') {
      // Base cuadrada oscura.
      box(
        scene,
        [1.1, 0.12, 1.1],
        materials.black,
        o.x,
        0.1,
        o.z
      );

      // Cuerpo naranja del cono.
      mesh(
        new T.ConeGeometry(
          0.5,  // Radio de la base.
          1.25, // Altura.
          8     // Segmentos alrededor de la base.
        ),
        materials.orange,
        scene,
        o.x,
        0.75,
        o.z
      );

      // Franja clara creada con un cilindro de radios diferentes.
      mesh(
        new T.CylinderGeometry(
          0.24, // Radio superior.
          0.33, // Radio inferior.
          0.22, // Altura de la franja.
          8     // Segmentos.
        ),
        materials.cream,
        scene,
        o.x,
        0.85,
        o.z
      );
    }
  }

  // Carteles que presentan información durante el recorrido.
  //
  // Argumentos de sign:
  // padre, texto, posición X, posición Z y ancho.

  // Cartel de bienvenida, a la izquierda.
  sign(scene, 'TAKE THE REAL JS ROUTE', -12, -9, 6);

  // Cartel con tu nombre, a la derecha.
  sign(scene, 'FERNANDO N LÓPEZ', 11, -42, 6);

  // Cartel con tu profesión, a la izquierda.
  sign(scene, 'THANKS FOR PLAYING', -12, -78, 5.7);

  // Cartel con tecnologías, a la derecha.
  sign(scene, 'REACT / TYPESCRIPT', 11, -112, 6);

  // Cartel centrado en la posición configurada para la meta.
  sign(scene, 'FINISH', 0, CONFIG.finishZ, 6);

  // Poste izquierdo del arco de llegada.
  box(
    scene,
    [0.35, 4.5, 0.35],
    materials.darkGreen,
    -7.8,
    2.25, // Mitad de su altura: la base queda en Y = 0.
    CONFIG.finishZ
  );

  // Poste derecho del arco.
  box(
    scene,
    [0.35, 4.5, 0.35],
    materials.darkGreen,
    7.8,
    2.25,
    CONFIG.finishZ
  );

  // Viga horizontal que une ambos postes.
  box(
    scene,
    [16, 0.65, 0.45],
    materials.darkGreen,
    0,
    4.4,
    CONFIG.finishZ
  );

  // Construye una línea de llegada ajedrezada.
  // El primer bucle recorre 16 columnas sobre X.
  for (let i = 0; i < 16; i++) {
    // El segundo bucle crea 2 filas sobre Z.
    // En total se construyen 16 × 2 = 32 casillas.
    for (let j = 0; j < 2; j++) {
      box(
        scene,

        // Casilla cuadrada y muy delgada.
        [1, 0.035, 1],

        // Alterna el color según la suma de columna y fila.
        // Resto 1: crema.
        // Resto 0: oscuro.
        (i + j) % 2 ? materials.cream : materials.black,

        // Distribuye los centros desde X = -7.5 hasta X = 7.5.
        i - 7.5,

        // Sitúa las casillas por encima de la superficie de la ruta.
        0.08,

        // Centra las dos filas alrededor de la coordenada de la meta.
        CONFIG.finishZ + j - 0.5
      );
    }
  }

  // Construye un pequeño taller al costado de la ruta.

  // Cuerpo principal del edificio.
  box(
    scene,
    [5, 3, 4],
    materials.blue,
    17,  // Fuera de la ruta, hacia la derecha.
    1.5, // Mitad de su altura: base en Y = 0.
    -55
  );

  // Crea el techo como un cono de cuatro lados.
  // Con cuatro segmentos, su forma se parece a una pirámide.
  const roof = mesh(
    new T.ConeGeometry(
      4.2, // Radio de la base.
      1.5, // Altura.
      4    // Cuatro lados.
    ),
    materials.orange,
    scene,
    17,
    3.65,
    -55
  );

  // Gira el techo 45° alrededor del eje vertical.
  roof.rotation.y = Math.PI / 4;

  // Reduce su profundidad un 15%.
  roof.scale.z = 0.85;

  // Crea la puerta en la fachada orientada hacia Z positivo.
  // Su profundidad es mínima: está colocada como una placa.
  box(
    scene,
    [1.3, 1.8, 0.08],
    materials.cream,
    17,
    1,
    -52.95
  );

  // Crea dos ventanas a ambos lados de la puerta.
  // Ejecuta una vuelta para X = 15.5 y otra para X = 18.5.
  for (const x of [15.5, 18.5]) {
    box(
      scene,
      [0.9, 0.8, 0.08],
      materials.darkGreen,
      x,
      1.8,
      -52.94
    );
  }

  // Construye ocho colinas geométricas en los alrededores.
  for (let i = 0; i < 8; i++) {
    const hill = mesh(
      new T.ConeGeometry(
        12,               // Radio de la base.
        12 + (i % 3) * 4, // Alterna alturas de 12, 16 y 20.
        5                 // Cinco lados para una silueta low poly.
      ),
      materials.green,
      scene,

      // Alterna el lado:
      // índice impar: X positivo.
      // índice par: X negativo.
      //
      // Además, aleja progresivamente las colinas de la ruta.
      (i % 2 ? 1 : -1) * (32 + i * 3),

      // Coloca su centro a una altura de 4.
      // Como los conos son altos, su parte inferior queda bajo el suelo.
      4,

      // Separa las colinas 24 unidades sobre el recorrido.
      -i * 24
    );

    // Da una orientación diferente a cada colina.
    // i se interpreta como un ángulo en radianes.
    hill.rotation.y = i;

    // Evita que estas colinas proyecten sombras.
    hill.castShadow = false;
  }
}