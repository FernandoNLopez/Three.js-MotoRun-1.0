// Importa dos hooks de React:
// useEffect: ejecuta tareas como registrar y limpiar eventos.
// useState: guarda valores que, al cambiar, actualizan la interfaz.
import { useEffect, useState } from 'react';

// Importa el componente que dibuja y ejecuta el juego 3D.
// Mode es un tipo de TypeScript: describe los estados posibles del juego.
import GameCanvas, { type Mode } from './GameCanvas';

// Importa la configuración: nombre, profesión, mensaje y email.
import { CONFIG } from './game/config';

// freshState: crea el estado inicial de la moto.
// distanceProgress: calcula cuánto avanzó hacia la meta.
// Controls: tipo que describe los controles.
// BikeState: tipo que describe los datos de la moto y la partida.
import {
  freshState,
  distanceProgress,
  type Controls,
  type BikeState,
} from './game/physics';

// Objeto con todos los controles desactivados.
// ": Controls" comprueba que el objeto tenga la estructura esperada.
const clearControls: Controls = {
  forward: false, // No está acelerando.
  brake: false,   // No está frenando.
  left: false,    // No está girando a la izquierda.
  right: false,   // No está girando a la derecha.
};

// Define y exporta el componente principal de la aplicación.
export default function App() {
  // mode guarda el estado actual de la pantalla/partida.
  // setMode permite cambiarlo.
  // <Mode> limita el valor a las opciones definidas en ese tipo.
  const [mode, setMode] = useState<Mode>('ready');

  // Contador usado para avisar a GameCanvas que debe reiniciar.
  // Cada reinicio aumenta este número.
  const [restart, setRestart] = useState(0);

  // Guarda tiempo, posición, velocidad, choques y otros datos del juego.
  // React ejecuta freshState para obtener el valor inicial.
  // Pasar la función evita recalcular ese valor en cada renderizado.
  const [stats, setStats] = useState<BikeState>(freshState);

  // Guarda qué botones táctiles están presionados.
  const [touch, setTouch] = useState<Controls>(clearControls);

  // Indica si el panel de instrucciones está abierto.
  const [help, setHelp] = useState(false);

  // Función que comienza una partida desde cero.
  const reset = () => {
    // Desactiva todos los controles táctiles.
    setTouch(clearControls);

    // Reemplaza las estadísticas por un estado inicial nuevo.
    setStats(freshState());

    // Usa el valor anterior del contador y le suma uno.
    // GameCanvas detecta este cambio y reinicia su simulación.
    setRestart((n) => n + 1);

    // Pasa el juego al estado de ejecución.
    setMode('running');
  };

  // Registra los atajos de teclado al montar el componente.
  useEffect(() => {
    // Función que recibe información sobre la tecla presionada.
    const key = (e: KeyboardEvent) => {
      // Si mantenés una tecla presionada, el navegador repite el evento.
      // Ignoramos esas repeticiones para no alternar pausa continuamente.
      if (e.repeat) return;

      // Convierte la tecla a minúscula para aceptar tanto "r" como "R".
      // Al presionar R, reinicia la partida.
      if (e.key.toLowerCase() === 'r') {
        reset();
      }

      // P o Escape alternan entre jugar y pausar.
      if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        // Evita que un botón táctil siga activo durante la pausa.
        setTouch(clearControls);

        // La función recibe el modo anterior en la variable m.
        setMode((m) =>
          m === 'running'
            ? 'paused'  // Si estaba jugando, pausa.
            : m === 'paused'
              ? 'running' // Si estaba pausado, continúa.
              : m         // Para los demás estados, conserva el modo.
        );
      }

      // Enter comienza el juego solamente desde la pantalla inicial.
      if (e.key === 'Enter') {
        setMode((m) => (m === 'ready' ? 'running' : m));
      }
    };

    // Escucha las pulsaciones de teclado en la ventana.
    window.addEventListener('keydown', key);

    // React ejecuta esta limpieza al desmontar el componente.
    // Quita exactamente la función que registramos arriba.
    return () => {
      window.removeEventListener('keydown', key);
    };

    // El array vacío indica que el efecto no depende de valores cambiantes.
    // En desarrollo, StrictMode puede hacer un montaje de prueba adicional.
  }, []);

  // distanceProgress devuelve un número entre 0 y 1.
  // Lo multiplicamos por 100 y redondeamos para mostrar un porcentaje.
  const pct = Math.round(distanceProgress(stats) * 100);

  // Muestra el tiempo con un decimal y agrega la unidad "s".
  // Por ejemplo: 12.345 se muestra como "12.3s".
  const time = stats.time.toFixed(1) + 's';

  // Función auxiliar que genera un botón táctil.
  // keyof Controls acepta solamente nombres de propiedades de Controls:
  // "forward", "brake", "left" o "right".
  const control = (
    name: keyof Controls,
    label: string,
    icon: string
  ) => (
    <button
      // Nombre accesible para lectores de pantalla.
      aria-label={label}

      // Combina una clase general con una específica del control.
      // Ejemplo: "touch-key left".
      className={'touch-key ' + name}

      // Se ejecuta cuando comienza el contacto con mouse, dedo o lápiz.
      onPointerDown={(e) => {
        // El botón captura este puntero.
        // Así puede recibir su liberación aunque salga del botón.
        e.currentTarget.setPointerCapture(e.pointerId);

        // s es el estado anterior de los controles.
        // ...s copia sus propiedades.
        // [name] modifica dinámicamente la propiedad elegida.
        setTouch((s) => ({
          ...s,
          [name]: true,
        }));
      }}

      // Al soltar el puntero, desactiva ese control.
      onPointerUp={() =>
        setTouch((s) => ({
          ...s,
          [name]: false,
        }))
      }

      // Desactiva el control si el navegador cancela el contacto.
      onPointerCancel={() =>
        setTouch((s) => ({
          ...s,
          [name]: false,
        }))
      }

      // También lo desactiva si el botón pierde la captura del puntero.
      onLostPointerCapture={() =>
        setTouch((s) => ({
          ...s,
          [name]: false,
        }))
      }
    >
      {/* Muestra el símbolo recibido: flecha o icono de freno. */}
      {icon}
    </button>
  );

  // Devuelve el JSX que React convierte en la interfaz.
  return (
    <main className="app">
      {/* Escenario y simulación del juego 3D. */}
      <GameCanvas
        // Le indica si debe ejecutar, pausar o detener la partida.
        mode={mode}

        // Un cambio en este contador le indica que debe reiniciar.
        restart={restart}

        // Envía el estado de los controles táctiles.
        touch={touch}

        // GameCanvas llama esta función para actualizar las estadísticas.
        onUpdate={setStats}

        // Se ejecuta cuando la moto cruza la meta.
        onFinish={(s) => {
          // Guarda las estadísticas finales que entrega GameCanvas.
          setStats(s);

          // Desactiva los controles táctiles.
          setTouch(clearControls);

          // Muestra la pantalla de finalización.
          setMode('finished');
        }}

        // GameCanvas puede pedir una pausa, por ejemplo al perder el foco.
        onPause={() => {
          // Limpia los controles activos.
          setTouch(clearControls);

          // Cambia al estado pausado.
          setMode('paused');
        }}
      />

      {/* Encabezado de la página. */}
      <header>
        {/* Logo que permite regresar a la pantalla inicial. */}
        <a
          className="logo"
          href="#"
          onClick={(e) => {
            // Evita la navegación normal del enlace hacia "#".
            e.preventDefault();

            // Muestra la pantalla inicial.
            setMode('ready');

            // Solicita que el escenario vuelva al estado inicial.
            setRestart((n) => n + 1);

            // Restablece las estadísticas.
            setStats(freshState());
          }}
        >
          fnl

          {/* Símbolo decorativo del logo. */}
          <span className="logo-star">✳</span>
        </a>

        {/* Frase del encabezado. */}
        <div className="edition">
          {/* Elemento vacío al que CSS le da forma de punto. */}
          <span className="dot" />
          A LITTLE RIDE, A BIG HELLO.
        </div>

        {/* Agrupa los botones de descarga y ayuda. */}
        <div className="header-buttons">
          {/* download indica que el enlace se usa para descargar el ZIP. */}
          <a
            className="code"
            href="/fernando-moto-run.zip"
            download
          >
            Get the code ↗
          </a>

          {/* Botón para abrir o cerrar las instrucciones. */}
          <button
            onClick={() => {
              // Invierte el valor actual: abierto pasa a cerrado y viceversa.
              setHelp(!help);

              // Si se abre durante una partida, pausa el juego.
              if (mode === 'running') {
                setTouch(clearControls);
                setMode('paused');
              }
            }}

            // Comunica a tecnologías de asistencia si el panel está abierto.
            aria-expanded={help}

            // Relaciona el botón con el panel cuyo id es "help-panel".
            aria-controls="help-panel"
          >
            ?
          </button>
        </div>
      </header>

      {/* Identificación visual del circuito. */}
      <div className="location">
        <span>SCENIC ROUTE</span>
        <strong>
          Moto Run
          <span> / 001</span>
        </strong>
      </div>

      {/* && muestra el panel solamente si la condición es verdadera. */}
      {/* Este panel aparece cuando se juega o cuando se pausa. */}
      {(mode === 'running' || mode === 'paused') && (
        <div className="hud">
          {/* Encabezado del panel de progreso. */}
          <div className="hud-top">
            <span>FINISH LINE</span>

            {/* Inserta el porcentaje calculado anteriormente. */}
            <strong>{pct}%</strong>
          </div>

          {/* Fondo de la barra de progreso. */}
          <div className="progress-track">
            {/* El ancho de esta barra depende del avance de la moto. */}
            {/* El primer par de llaves entra en JavaScript. */}
            {/* El segundo par crea el objeto de estilos. */}
            <div style={{ width: pct + '%' }} />
          </div>

          {/* Tiempo, choques y botón de pausa. */}
          <div className="hud-bottom">
            <span>{time}</span>
            <span>{stats.bumps} bumps</span>

            <button
              onClick={() => {
                // Desactiva controles para evitar entradas retenidas.
                setTouch(clearControls);

                // Alterna entre ejecución y pausa.
                setMode(mode === 'running' ? 'paused' : 'running');
              }}
            >
              {/* Cambia el texto según el estado actual. */}
              {mode === 'paused' ? 'Resume ▷' : 'Pause Ⅱ'}
            </button>
          </div>
        </div>
      )}

      {/* Pantalla inicial: aparece solamente en modo "ready". */}
      {mode === 'ready' && (
        <section className="intro">
          <div className="eyebrow">A TINY 3D ADVENTURE</div>

          {/* br genera un salto de línea; em marca énfasis. */}
          <h1>
            Ride.
            <br />
            Explore.
            <br />
            <em>Say hello.</em>
          </h1>

          {/* Descripción breve del juego. */}
          <p>
            One motorcycle. A few obstacles.
            <br />
            Someone worth meeting at the finish line.
          </p>

          {/* Botón para comenzar una partida nueva. */}
          <button
            className="primary"
            onClick={() => {
              // Cierra las instrucciones si estaban abiertas.
              setHelp(false);

              // Reinicia y comienza el juego.
              reset();
            }}
          >
            Let’s ride
            <span>↗</span>
          </button>

          {/* Recordatorio de los métodos de control. */}
          <div className="intro-hint">
            WASD / ARROW KEYS
            <span>·</span>
            TOUCH CONTROLS
          </div>
        </section>
      )}

      {/* Muestra la pausa solamente si la ayuda está cerrada. */}
      {/* !help significa "help es falso". */}
      {mode === 'paused' && !help && (
        <div className="overlay">
          <section className="pause-card">
            <span className="eyebrow">TAKE YOUR TIME</span>
            <h2>A little pit stop.</h2>
            <p>The scenic route isn’t going anywhere.</p>

            {/* Continúa la partida sin reiniciar las estadísticas. */}
            <button
              className="primary"
              onClick={() => setMode('running')}
            >
              Keep riding
              <span>↗</span>
            </button>

            {/* Comienza otra partida desde cero. */}
            <button className="text-button" onClick={reset}>
              Start again ↺
            </button>
          </section>
        </div>
      )}

      {/* Panel de instrucciones: aparece cuando help es verdadero. */}
      {help && (
        <div className="overlay">
          {/* Su id coincide con aria-controls del botón de ayuda. */}
          <section id="help-panel" className="help-card">
            {/* Cierra la ayuda; no cambia el modo de la partida. */}
            <button
              className="close"
              aria-label="Close instructions"
              onClick={() => setHelp(false)}
            >
              ×
            </button>

            <span className="eyebrow">HOW TO RIDE</span>
            <h2>Keep it simple.</h2>

            {/* kbd representa visualmente una tecla del teclado. */}
            <div className="instruction">
              <kbd>W / ↑</kbd>
              <span>Accelerate</span>
            </div>

            {/* Instrucción para girar. */}
            <div className="instruction">
              <kbd>A D / ← →</kbd>
              <span>Steer</span>
            </div>

            {/* Instrucción para frenar. */}
            <div className="instruction">
              <kbd>S / ↓ / SPACE</kbd>
              <span>Brake</span>
            </div>

            {/* Instrucción para pausar. */}
            <div className="instruction">
              <kbd>P / ESC</kbd>
              <span>Pause</span>
            </div>

            {/* Instrucción para reiniciar. */}
            <div className="instruction">
              <kbd>R</kbd>
              <span>Restart</span>
            </div>

            {/* Explicación del objetivo y de los choques. */}
            <p>
              Follow the road, avoid the obstacles and cross the checkered
              line. Bumps slow you down, but the ride goes on.
            </p>

            {/* Cierra las instrucciones y continúa si estaba pausado. */}
            <button
              className="primary"
              onClick={() => {
                setHelp(false);

                if (mode === 'paused') {
                  setMode('running');
                }
              }}
            >
              Got it
              <span>↗</span>
            </button>
          </section>
        </div>
      )}

      {/* Pantalla final: requiere haber terminado y tener la ayuda cerrada. */}
      {mode === 'finished' && !help && (
        <div className="overlay finish-overlay">
          <section className="finish-card">
            {/* Bandera decorativa que representa la meta. */}
            <span className="finish-icon">⚑</span>

            <span className="eyebrow">
              YOU MADE IT. NICE TO MEET YOU.
            </span>

            {/* Lee tu nombre y profesión desde la configuración. */}
            <h2>
              {CONFIG.name}
              <span>{CONFIG.role}.</span>
            </h2>

            {/* Lee el mensaje de presentación desde la configuración. */}
            <p>{CONFIG.message}</p>

            {/* Resumen de la partida terminada. */}
            <div className="finish-stats">
              <span>
                <b>{time}</b> your ride
              </span>

              <span>
                <b>{stats.bumps}</b> bumps along the way
              </span>
            </div>

            {/* Acciones disponibles después de llegar a la meta. */}
            <div className="finish-actions">
              {/* Solo muestra el enlace si contactEmail tiene contenido. */}
              {CONFIG.contactEmail && (
                <a
                  className="primary"

                  // mailto abre la aplicación de correo configurada
                  // con tu dirección como destinatario.
                  href={'mailto:' + CONFIG.contactEmail}
                >
                  Let’s talk ↗
                </a>
              )}

              {/* Permite jugar otra vez. */}
              <button className="primary" onClick={reset}>
                One more ride
                <span>↺</span>
              </button>

              {/* Panel de redes sociales*/}
              <a
                className="text-button"
                href=""
              >
                My Social Media
              </a>
            </div>
          </section>
        </div>
      )}

      {/* Controles táctiles: visibles únicamente durante la partida. */}
      {mode === 'running' && (
        <div className="touch-controls">
          {/* Cada llamada crea un botón usando la función control. */}
          {control('left', 'Steer left', '←')}
          {control('right', 'Steer right', '→')}
          {control('brake', 'Brake', 'Ⅱ')}
          {control('forward', 'Accelerate', '↑')}
        </div>
      )}

     
      <footer>
       
        <span>
          FERNANDO N LÓPEZ PAREDES
          <span className="footer-slash">/</span>
          WEB APPS DEVELOPER
        </span>

        {/* Recordatorio controles*/}
        <div className="desktop-controls">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd>
          <span>TO RIDE</span>
          <kbd>R</kbd>
          <span>TO RESTART</span>
        </div>

        {/* Frase decorativa del pie de página. */}
        <span className="footer-note">
          @frn_lpz ✳
        </span>
      </footer>
    </main>
  );
}
