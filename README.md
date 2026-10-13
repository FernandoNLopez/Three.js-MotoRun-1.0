# Fernando Moto Run

A small, original low-poly motorcycle game inspired by the idea of exploring a 3D world by driving. Built with React, TypeScript, Three.js and Vite. No downloaded 3D models, no backend, no physics engine required.

## Abrir en Visual Studio Code

1. Instalá Node.js 22.18 o superior (o Node.js 24 LTS).
2. Descomprimí el ZIP.
3. En VS Code: Archivo → Abrir carpeta → `fernando-moto-run` (la carpeta con package.json).
4. Abrí Terminal → Nueva terminal y ejecutá:

```bash
npm install
npm run dev
```

5. Abrí la URL local que aparece en la terminal. Los cambios se actualizan al guardar.

Para generar la página lista para hosting:

```bash
npm test
npm run build
```

Subí el contenido de `dist` a un hosting estático. No necesita claves ni cuentas externas. Para montarlo dentro de un sitio existente, ajustá la base de Vite si se aloja en una subcarpeta.

## Controles

- W / ↑: acelerar.
- A D / ← →: dirección.
- S / ↓ / espacio: frenar.
- P / Escape: pausar y continuar.
- R: reiniciar.
- Botones en pantalla: controles táctiles.

La moto tiene auto centrado suave y no marcha atrás. Chocar te frena y te aparta ligeramente del obstáculo. No se pierden vidas: la idea es completar un recorrido corto y mostrar el mensaje al final. El cronómetro mide el tiempo activo de juego; no guarda resultados.

## Mapa del código

- `src/App.tsx`: interfaz React, inicio/pausa/meta y controles táctiles.
- `src/GameCanvas.tsx`: renderizador Three.js, teclado, cámara y ciclo de juego.
- `src/game/config.ts`: nombre, mensaje, correo de contacto opcional, velocidad, meta y obstáculos.
- `src/game/physics.ts`: simulación independiente, colisiones y condición de victoria.
- `src/game/models.ts`: moto, piloto, árboles y carteles hechos con geometrías simples.
- `src/game/world.ts`: escenario, ruta, taller y meta.
- `src/style.css`: diseño de la interfaz y ajustes móviles.
- `tests/physics.test.ts`: comprobaciones del movimiento y del recorrido completo.

## Tu contacto

En `src/game/config.ts`, reemplazá `contactEmail: ''` por tu email. Entonces aparece el botón “Let’s talk” en la meta. No hay un contacto inventado en la versión de ejemplo.

## Aprender por pasos

1. Cambiá nombre y texto de meta en config.ts.
2. Mové un obstáculo editando x y z (z negativo avanza por la pista).
3. Modificá velocidad y aceleración.
4. Cambiá los colores y las piezas de la moto en models.ts.
5. Agregá un cartel con sign() en world.ts.
6. Integrá el juego como una ruta/página de tu propio sitio.

React mantiene el estado de interfaz. La simulación funciona a través de una función pura `step`. Three.js dibuja el estado con `setAnimationLoop`. El tiempo delta evita que la velocidad dependa de los FPS. La cámara sigue la moto mediante interpolación. Al desmontar se limpian eventos y recursos gráficos.

Limitaciones del ejemplo: físicas arcade simplificadas, modelos procedurales, sin sonido ni persistencia. Se requiere WebGL con aceleración gráfica. La tipografía web tiene fallback local. El ZIP descargable es una copia inicial: regeneralo si querés distribuir futuras modificaciones.
