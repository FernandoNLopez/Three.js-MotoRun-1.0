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

      {/* Panel con enlaces a tus redes sociales. */}
      {/* Panel de redes sociales con logos y nombres. */}
        <nav className="social-links" aria-label="Social media">
          {/* LinkedIn */}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <svg
              className="social-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
            </svg>

            <span className="social-name">LinkedIn</span>
          </a>

          {/* Instagram */}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <svg
              className="social-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              {/* Contorno de la cámara. */}
              <rect x="3" y="3" width="18" height="18" rx="5" />

              {/* Lente central. */}
              <circle cx="12" cy="12" r="4" />

              {/* Punto superior derecho. */}
              <circle
                cx="17.5"
                cy="6.5"
                r="1"
                fill="currentColor"
                stroke="none"
              />
            </svg>

            <span className="social-name">Instagram</span>
          </a>

          {/* GitHub */}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <svg
              className="social-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.334-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 0 1 3.003-.404c1.018.005 2.042.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.805 5.625-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>

            <span className="social-name">GitHub</span>
          </a>

          {/* Discord */}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Discord"
          >
            <svg
              className="social-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.007.128 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.158-1.085-2.158-2.419 0-1.333.956-2.419 2.158-2.419 1.212 0 2.177 1.095 2.158 2.419 0 1.334-.956 2.419-2.158 2.419zm7.975 0c-1.183 0-2.158-1.085-2.158-2.419 0-1.333.956-2.419 2.158-2.419 1.212 0 2.177 1.095 2.158 2.419 0 1.334-.946 2.419-2.158 2.419z" />
            </svg>

            <span className="social-name">Discord</span>
          </a>
        </nav>
      </footer>
    </main>
  );
}
