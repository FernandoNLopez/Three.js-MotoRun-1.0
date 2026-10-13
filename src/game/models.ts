// Importa Three.js completo usando T como alias.
import * as T from 'three';

// Función auxiliar que recibe un color y devuelve un material.
// ": string" indica que color debe ser una cadena de texto.
const mat = (color: string) =>
  new T.MeshStandardMaterial({
    // Equivale a escribir color: color.
    color,

    // Rugosidad de la superficie:
    // 0 produce reflejos más definidos; 1, más difusos.
    roughness: 0.82,

    // Hace visible el sombreado de las caras de la geometría.
    // Con pocos polígonos, ayuda a conseguir la estética low poly.
    flatShading: true,
  });

// Exporta una colección de materiales reutilizables.
// Cada llamada a mat crea un material diferente.
export const materials = {
  orange: mat('#df612f'),    // Tanque y otras piezas naranjas.
  black: mat('#303733'),     // Neumáticos, asiento y piezas oscuras.
  cream: mat('#f5e5c4'),     // Casco, faro y detalles claros.
  metal: mat('#8d9b94'),     // Piezas de color metálico.
  green: mat('#64866f'),     // Vegetación clara.
  darkGreen: mat('#3c675b'), // Vegetación oscura.
  trunk: mat('#957458'),    // Troncos.
  stone: mat('#aba491'),    // Rocas.
  blue: mat('#577d82'),     // Ropa del piloto.
  wood: mat('#b78051'),     // Madera.
};

// Nota: el nombre "metal" solo identifica el material.
// Esta función no configura metalness; ese material también usa
// el valor predeterminado de metalness, que es 0.

// Crea una malla, la posiciona y la agrega a un objeto padre.
export function mesh(
  // Geometría: define la forma del objeto.
  geometry: T.BufferGeometry,

  // Material: define cómo se ve su superficie.
  material: T.Material,

  // Objeto que contendrá esta malla: una escena, grupo u otro Object3D.
  parent: T.Object3D,

  // Posición local. Si se omiten estos valores, se usa 0.
  x = 0,
  y = 0,
  z = 0
) {
  // Combina geometría y material para crear un objeto dibujable.
  const m = new T.Mesh(geometry, material);

  // Define su posición respecto del padre.
  m.position.set(x, y, z);

  // Permite que proyecte sombras.
  m.castShadow = true;

  // Permite que otras sombras aparezcan sobre su superficie.
  m.receiveShadow = true;

  // Agrega la malla como hija del objeto padre.
  parent.add(m);

  // Devuelve la malla para poder rotarla, escalarla o modificarla.
  return m;
}

// Función auxiliar para crear cajas rectangulares.
export function box(
  // Objeto que contendrá la caja.
  parent: T.Object3D,

  // Tupla de exactamente tres números:
  // [ancho en X, alto en Y, profundidad en Z].
  size: [number, number, number],

  // Material que tendrá la caja.
  material: T.Material,

  // Posición local opcional.
  x = 0,
  y = 0,
  z = 0
) {
  // ...size separa los tres elementos del array como argumentos.
  // Por ejemplo, [1, 2, 3] se convierte en BoxGeometry(1, 2, 3).
  //
  // Luego mesh agrega la caja al padre y devuelve la malla.
  return mesh(
    new T.BoxGeometry(...size),
    material,
    parent,
    x,
    y,
    z
  );
}

// Construye la moto completa, incluido el piloto.
export function makeBike() {
  // Grupo principal que contiene todas las piezas.
  // Al moverlo o rotarlo, se transforma la moto completa.
  const g = new T.Group();

  // Array que conservará los grupos de las ruedas.
  // GameCanvas los utiliza para animar su rotación.
  const wheels: T.Group[] = [];

  // Ejecuta el bloque dos veces:
  // z = -0.87: rueda delantera.
  // z = 0.88: rueda trasera.
  for (const z of [-0.87, 0.88]) {
    // Grupo individual que reúne neumático, centro y radios.
    const wheel = new T.Group();

    // Centra la rueda en X, la eleva y la coloca delante o detrás.
    wheel.position.set(0, 0.48, z);

    // Agrega la rueda al grupo principal de la moto.
    g.add(wheel);

    // Crea el neumático con forma de toro o dona.
    const tire = mesh(
      new T.TorusGeometry(
        0.43, // Radio desde el centro del toro al centro de su tubo.
        0.12, // Radio del tubo: grosor del neumático.
        8,    // Segmentos alrededor de la sección del tubo.
        16    // Segmentos alrededor del anillo.
      ),
      materials.black,
      wheel
    );

    // El toro viene orientado con su eje en Z.
    // Lo gira 90° sobre Y para que su eje quede en X.
    tire.rotation.y = Math.PI / 2;

    // Crea el centro de la rueda mediante un cilindro.
    const hub = mesh(
      new T.CylinderGeometry(
        0.29, // Radio superior.
        0.29, // Radio inferior.
        0.15, // Altura o grosor del cilindro.
        12    // Segmentos alrededor de su circunferencia.
      ),
      materials.metal,
      wheel
    );

    // Los cilindros se crean con su eje longitudinal en Y.
    // Esta rotación coloca ese eje en X.
    hub.rotation.z = Math.PI / 2;

    // Crea seis barras para representar los radios de la rueda.
    for (let a = 0; a < 6; a++) {
      // Caja fina, alargada sobre Z y centrada en la rueda.
      const spoke = box(
        wheel,
        [0.13, 0.035, 0.57],
        materials.cream
      );

      // Distribuye las barras alrededor del eje X.
      // Math.PI / 3 equivale a 60°.
      spoke.rotation.x = (a * Math.PI) / 3;
    }

    // Conserva el grupo para poder animarlo posteriormente.
    wheels.push(wheel);
  }

  // Crea una pieza alargada que representa el chasis.
  const frame = box(
    g,
    [0.24, 0.2, 1.8],
    materials.black,
    0,
    0.8,
    0
  );

  // Inclina ligeramente el chasis alrededor de X.
  frame.rotation.x = 0.1;

  // Crea el tanque naranja, algo adelantado respecto del centro.
  const tank = box(
    g,
    [0.55, 0.4, 0.66],
    materials.orange,
    0,
    1.06,
    -0.25
  );

  // Inclina el tanque ligeramente.
  tank.rotation.x = -0.13;

  // Crea el asiento, situado hacia la parte trasera.
  box(
    g,
    [0.44, 0.16, 0.72],
    materials.black,
    0,
    1.15,
    0.43
  );

  // Crea una barra de la horquilla delantera, del lado izquierdo.
  // Como box devuelve la malla, podemos modificar su rotación directamente.
  box(
    g,
    [0.12, 0.75, 0.12],
    materials.metal,
    -0.19,
    0.9,
    -0.88
  ).rotation.x = -0.18;

  // Crea la otra barra de la horquilla, del lado derecho.
  box(
    g,
    [0.12, 0.75, 0.12],
    materials.metal,
    0.19,
    0.9,
    -0.88
  ).rotation.x = -0.18;

  // Crea el manillar: una barra ancha sobre el eje X.
  box(
    g,
    [0.9, 0.08, 0.1],
    materials.black,
    0,
    1.34,
    -0.87
  );

  // Crea el faro mediante un cilindro corto.
  // Es una pieza clara; no es una fuente de luz.
  const headlight = mesh(
    new T.CylinderGeometry(
      0.15, // Radio superior.
      0.15, // Radio inferior.
      0.12, // Grosor.
      12    // Segmentos.
    ),
    materials.cream,
    g,
    0,
    1.15,
    -1.02
  );

  // Orienta el eje del cilindro sobre Z para mirar hacia el frente.
  headlight.rotation.x = Math.PI / 2;

  // Crea una pieza lateral que representa el escape.
  box(
    g,
    [0.22, 0.22, 0.75],
    materials.metal,
    0.34,
    0.68,
    0.52
  );

  // A partir de aquí se construye el piloto con figuras simples.

  // Crea el torso usando una caja azul.
  const torso = box(
    g,
    [0.48, 0.65, 0.35],
    materials.blue,
    0,
    1.61,
    0.31
  );

  // Inclina el torso hacia la parte delantera.
  torso.rotation.x = -0.27;

  // Crea el casco con una esfera de pocos segmentos.
  const helmet = mesh(
    new T.SphereGeometry(
      0.29, // Radio de la esfera.
      12,   // Segmentos horizontales.
      8     // Segmentos verticales.
    ),
    materials.cream,
    g,
    0,
    2.08,
    0.15
  );

  // Conserva ancho y profundidad, pero aumenta la altura un 7%.
  helmet.scale.set(1, 1.07, 1);

  // Crea una caja oscura que representa el visor del casco.
  box(
    g,
    [0.44, 0.13, 0.14],
    materials.black,
    0,
    2.08,
    -0.08
  );

  // Construye extremidades a ambos lados del piloto.
  // Primera vuelta: x = -0.3.
  // Segunda vuelta: x = 0.3.
  for (const x of [-0.3, 0.3]) {
    // Crea un brazo alargado hacia el manillar.
    const arm = box(
      g,
      [0.16, 0.18, 0.65],
      materials.blue,
      x,
      1.53,
      -0.27
    );

    // Inclina el brazo.
    arm.rotation.x = -0.3;

    // Crea una pierna.
    const leg = box(
      g,
      [0.18, 0.58, 0.22],
      materials.black,
      x,
      1.0,
      0.25
    );

    // Inclina la pierna para simular la posición sobre la moto.
    leg.rotation.x = -0.38;

    // Crea el pie o bota de ese lado.
    box(
      g,
      [0.21, 0.13, 0.35],
      materials.black,
      x,
      0.73,
      0.11
    );
  }

  // Devuelve un objeto con:
  // group: la moto completa.
  // wheels: los grupos de las ruedas.
  //
  // "wheels" equivale a escribir wheels: wheels.
  return {
    group: g,
    wheels,
  };
}

// Construye un árbol y lo agrega al padre recibido.
export function tree(
  parent: T.Object3D, // Escena o grupo que contendrá el árbol.
  x: number,        // Posición lateral.
  z: number,        // Posición a lo largo del recorrido.
  scale = 1         // Tamaño general; 1 significa tamaño original.
) {
  // Agrupa todas las piezas del árbol.
  const g = new T.Group();

  // Ubica el árbol respecto del padre.
  g.position.set(x, 0, z);

  // Aplica la misma escala en X, Y y Z.
  // Por ejemplo, 2 duplica todas sus dimensiones.
  g.scale.setScalar(scale);

  // Agrega el grupo del árbol al padre.
  parent.add(g);

  // Crea el tronco con un cilindro de cinco lados.
  mesh(
    new T.CylinderGeometry(
      0.15, // Radio superior.
      0.25, // Radio inferior: base más ancha.
      1.7,  // Altura.
      5     // Segmentos alrededor del tronco.
    ),
    materials.trunk,
    g,
    0,
    0.85 // La mitad de 1.7: coloca la base del tronco en Y = 0.
    // Se omite z, por lo que mesh utiliza su valor predeterminado: 0.
  );

  // Crea tres niveles de follaje mediante conos.
  for (let i = 0; i < 3; i++) {
    mesh(
      new T.ConeGeometry(
        1.3 - i * 0.26, // Cada nivel tiene un radio menor.
        1.9,            // Altura de cada cono.
        5               // Cinco lados para la estética low poly.
      ),

      // i % 2 calcula el resto al dividir por 2.
      // Si es 1, usa verde oscuro; si es 0, verde claro.
      i % 2 ? materials.darkGreen : materials.green,

      g,
      0,

      // Cada nivel está 0.7 unidades más alto que el anterior.
      2 + i * 0.7
    );
  }
}

// Construye un cartel con texto y dos postes.
export function sign(
  parent: T.Object3D, // Objeto que contendrá el cartel.
  text: string,     // Texto que se dibujará.
  x: number,        // Posición lateral.
  z: number,        // Posición a lo largo del recorrido.
  width = 4         // Ancho del cartel en unidades del mundo 3D.
) {
  // Crea un canvas HTML auxiliar.
  // No se agrega al documento: se usa para fabricar una textura.
  const canvas = document.createElement('canvas');

  // Define la resolución del dibujo en píxeles.
  canvas.width = 768;
  canvas.height = 256;

  // Obtiene las herramientas de dibujo 2D del canvas.
  // "!" indica a TypeScript que asumimos que el contexto existe.
  // No comprueba esa condición en tiempo de ejecución.
  const c = canvas.getContext('2d')!;

  // Selecciona el color de relleno del fondo.
  c.fillStyle = '#f3e6c9';

  // Pinta un rectángulo que cubre todo el canvas.
  // Parámetros: x, y, ancho y alto.
  c.fillRect(0, 0, 768, 256);

  // Selecciona el color del borde.
  c.strokeStyle = '#2f5048';

  // Define el grosor del borde en píxeles.
  c.lineWidth = 12;

  // Dibuja el contorno de un rectángulo con margen respecto del canvas.
  c.strokeRect(10, 10, 748, 236);

  // Cambia el relleno para dibujar el texto en verde oscuro.
  c.fillStyle = '#2f5048';

  // Define una fuente en negrita, de 54 píxeles y familia sans-serif.
  c.font = 'bold 54px sans-serif';

  // Centra horizontalmente el texto respecto de la coordenada indicada.
  c.textAlign = 'center';

  // Centra verticalmente el texto respecto de la coordenada indicada.
  c.textBaseline = 'middle';

  // Dibuja el texto en el centro del canvas.
  // 384 y 128 son las mitades de su ancho y alto.
  // 690 limita el ancho máximo utilizado para dibujar el texto.
  c.fillText(text, 384, 128, 690);

  // Convierte el dibujo del canvas en una textura de Three.js.
  const texture = new T.CanvasTexture(canvas);

  // Indica que sus colores están expresados en el espacio sRGB.
  texture.colorSpace = T.SRGBColorSpace;

  // Crea la superficie del cartel combinando geometría y material.
  const board = new T.Mesh(
    // Plano rectangular.
    // La proporción 3:1 coincide con el canvas de 768 × 256.
    new T.PlaneGeometry(width, width / 3),

    new T.MeshStandardMaterial({
      // Usa el dibujo del canvas como imagen de la superficie.
      map: texture,

      // Hace visible el plano desde ambos lados.
      // El texto se verá invertido al observarlo desde atrás.
      side: T.DoubleSide,
    })
  );

  // Coloca el centro del cartel a 2.8 unidades de altura.
  board.position.set(x, 2.8, z);

  // Permite que el plano proyecte sombras.
  board.castShadow = true;

  // Agrega el cartel al padre.
  parent.add(board);

  // Crea el poste izquierdo.
  box(
    parent,
    [0.14, 2.6, 0.14], // Poste fino de 2.6 unidades de altura.
    materials.wood,
    x - width * 0.34,  // Desplazamiento hacia la izquierda.
    1.3,               // Mitad de su altura: base en Y = 0.
    z
  );

  // Crea el poste derecho.
  box(
    parent,
    [0.14, 2.6, 0.14],
    materials.wood,
    x + width * 0.34, // Desplazamiento hacia la derecha.
    1.3,
    z
  );
}
