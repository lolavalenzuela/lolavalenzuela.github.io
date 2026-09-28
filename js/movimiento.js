// movimiento.js — el movimiento del sitio: cómo entra el contenido al
// aparecer en pantalla, el parallax de las imágenes de proyecto, la franja
// de texto en loop y el imán de los botones.
//
// DÓNDE SE CALIBRA TODO: en css/animaciones.css, en el bloque "MOVIMIENTO —
// LA PERILLA GENERAL". Este archivo no tiene números sueltos: lee esas
// variables. La perilla --movimiento (1 normal, 0.5 la mitad, 0 quieto)
// afecta a todo, y la clase "sin-movimiento" en el <body> lo apaga entero.
//
// Regla de performance: solo se animan "transform" y "opacity", que el
// navegador resuelve sin rehacer el layout. Nada de animar alto, ancho ni
// posiciones.

// Lo primero: cancelar la red de seguridad que dejó armada el <head>. Si
// este archivo llegó a cargar, no hace falta: el contenido lo va a revelar
// el código de acá abajo. (Si NO hubiera cargado, el temporizador salta a
// los 3 segundos y muestra todo igual.)
clearTimeout(window.redDeSeguridadMovimiento);

// -- Herramientas chiquitas ---------------------------------------------

// Lee una variable CSS numérica (por ejemplo --parallax-fuerza: 0.06).
function leerNumero(nombre, porDefecto) {
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue(nombre)
    .trim();
  const numero = parseFloat(valor);
  return Number.isFinite(numero) ? numero : porDefecto;
}

// ¿Hay que quedarse quieto? Dos motivos: la persona pidió menos movimiento
// en su sistema, o el sitio tiene puesta la clase para apagarlo.
function pideQuieto() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.body.classList.contains("sin-movimiento")
  );
}

// Mouse de verdad (no una pantalla táctil).
function tieneMouse() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

// Todo lo que haya que desconectar al salir de la página.
const limpiezas = [];

// -- 1. REVELADO AL APARECER EN PANTALLA --------------------------------
//
// Cada elemento entra una sola vez, con un fundido y un desplazamiento
// corto hacia arriba. Los elementos se agrupan: dentro de un grupo entran
// escalonados, uno atrás del otro.

let observador = null;
const yaVistos = new WeakSet();

// Qué entra en cada tipo de página, y en qué orden. Cada array interno es
// un grupo: sus elementos entran escalonados entre sí.
function gruposDeLaPagina() {
  const uno = (sel) => [document.querySelector(sel)];
  const todos = (sel) => Array.from(document.querySelectorAll(sel));
  const pagina = document.body.dataset.pagina;

  if (pagina === "home") {
    return [
      uno(".header__nombre"),
      uno(".header__nav"),
      todos(".bloque-proyecto"),
      uno(".franja-movil"),
    ];
  }

  if (pagina === "about") {
    // El about no scrollea en desktop: entra todo junto al cargar, pero
    // escalonado para que se sienta que se arma.
    return [
      uno(".about__presentacion"),
      todos(".about__seccion"),
      uno(".about__foto"),
      uno(".about__volver"),
    ];
  }

  // Páginas de proyecto. El bloque de arriba y el título están en la
  // primera pantalla: no esperan al scroll, entran apenas carga.
  return [
    uno("[data-proyecto-imagen-wrapper]"),
    uno("[data-proyecto-titulo]"),
    uno("[data-proyecto-ficha]"),
    uno("[data-proyecto-descripcion]"),
    // Cada fila de media entra por su cuenta, con sus piezas escalonadas.
    ...todos(".proyecto__media-fila").map((fila) =>
      Array.from(fila.querySelectorAll(".proyecto__media-pieza"))
    ),
    todos(".proyecto__galeria picture, .proyecto__galeria > img, .proyecto__galeria > a"),
    uno("[data-proyecto-enlace-wrapper]"),
    uno(".proyecto__navegacion"),
  ];
}

// ¿Vale la pena animar este elemento? (existe, no está oculto y no entró ya)
function sirve(el) {
  return Boolean(el) && !el.hasAttribute("hidden") && !yaVistos.has(el);
}

function revelar(el) {
  yaVistos.add(el);
  el.classList.add("mov-visible");
  observador?.unobserve(el);
}

// El título del proyecto entra distinto: sube desde abajo detrás de un
// recorte. Para eso su texto tiene que estar envuelto en un <span>.
function envolverTitulo(el) {
  if (!el || el.querySelector(".mov-titulo-interior")) return;
  const interior = document.createElement("span");
  interior.className = "mov-titulo-interior";
  interior.textContent = el.textContent;
  el.replaceChildren(interior);
}

// Prepara los grupos: marca los elementos, les pone su retraso y los pone
// a la espera de aparecer en pantalla.
function prepararRevelado({ retrasoInicial = 0 } = {}) {
  const paso = leerNumero("--paso-stagger", 60);

  // Si el navegador no soporta IntersectionObserver, no se esconde nada:
  // el contenido se muestra tal cual, sin animación.
  if (typeof IntersectionObserver === "undefined") {
    gruposDeLaPagina()
      .flat()
      .filter(Boolean)
      .forEach((el) => el.classList.add("mov-visible"));
    return;
  }

  if (!observador) {
    observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) revelar(entrada.target);
        });
      },
      // Empieza a entrar un poco antes de llegar al borde de la pantalla,
      // así nunca se ve "aparecer tarde".
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
    );
    limpiezas.push(() => observador?.disconnect());
  }

  let orden = 0;
  gruposDeLaPagina().forEach((grupo) => {
    const utiles = grupo.filter(sirve);
    if (!utiles.length) return;
    utiles.forEach((el, i) => {
      el.classList.add("mov-revelar");
      // El retraso inicial solo se usa en la intro de la home.
      // Con intro (primera visita a la home) los grupos se encadenan uno
      // detrás de otro; sin intro, cada grupo escalona solo sus elementos
      // cuando le toca aparecer.
      const retraso = retrasoInicial
        ? retrasoInicial + orden * paso + i * paso
        : i * paso;
      el.style.setProperty("--mov-retraso", `${retraso}ms`);
      observador.observe(el);
    });
    orden += 1;
  });
}

// Segunda red de seguridad, además de la del <head>: a los 2,5 segundos
// revisa si quedó algo marcado que esté a la vista y todavía escondido, y
// lo muestra. Es por si el observador no llegara a avisar (una pestaña que
// se abrió en segundo plano, un navegador raro). Lo que está más abajo en
// la página sigue esperando su turno, así que las entradas por scroll no
// se pierden.
function redDeSeguridadDelRevelado() {
  const reloj = setTimeout(() => {
    document.querySelectorAll(".mov-revelar:not(.mov-visible)").forEach((el) => {
      const caja = el.getBoundingClientRect();
      const aLaVista = caja.top < window.innerHeight && caja.bottom > 0;
      if (aLaVista) revelar(el);
    });
  }, 2500);
  limpiezas.push(() => clearTimeout(reloj));
}

// -- 2. PARALLAX DE LAS IMÁGENES DE PROYECTO ----------------------------
//
// Las imágenes se desplazan unos pocos píxeles menos que el scroll, para
// dar profundidad. Se les da un zoom mínimo para compensar: si no, al
// moverse dejarían ver el borde de su caja.
//
// Solo en piezas que ya recortan (object-fit: cover) y que tienen su caja
// con el desborde oculto. Las que entran completas (las dos portadas de
// Fuera de Servicio, el teaser de Quomos y sus dos videos verticales) NO
// llevan parallax: moverlas las despegaría de su caja.

const DESPLAZAMIENTO_MAXIMO = 16; // px, el tope del movimiento
let piezasParallax = [];
let esperandoCuadro = false;

function medirPiezas() {
  piezasParallax.forEach((p) => {
    const alto = p.el.offsetHeight || 1;
    // Zoom justo para tapar el desplazamiento de arriba y de abajo.
    p.escala = 1 + (DESPLAZAMIENTO_MAXIMO * 2) / alto;
  });
}

function actualizarParallax() {
  esperandoCuadro = false;
  const fuerza = leerNumero("--parallax-fuerza", 0);
  const mitadPantalla = window.innerHeight / 2;
  piezasParallax.forEach((p) => {
    const caja = p.el.getBoundingClientRect();
    // Si está lejos de la pantalla, no se toca: ahorra trabajo.
    if (caja.bottom < -200 || caja.top > window.innerHeight + 200) return;
    const centro = caja.top + caja.height / 2;
    const bruto = (mitadPantalla - centro) * fuerza;
    const y = Math.max(-DESPLAZAMIENTO_MAXIMO, Math.min(DESPLAZAMIENTO_MAXIMO, bruto));
    p.el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${p.escala})`;
  });
}

function pedirCuadro() {
  if (esperandoCuadro) return;
  esperandoCuadro = true;
  requestAnimationFrame(actualizarParallax);
}

function iniciarParallax() {
  // En pantallas táctiles queda apagado: el scroll con el dedo es mucho
  // más sensible y el movimiento se siente inestable.
  if (pideQuieto() || !tieneMouse()) return;
  if (leerNumero("--parallax-fuerza", 0) <= 0) return;
  if (document.body.dataset.pagina !== "proyecto") return;

  const candidatas = [
    ...document.querySelectorAll(".proyecto__imagen-principal"),
    ...document.querySelectorAll(
      ".proyecto__media-pieza:not(.proyecto__media-pieza--completa) .proyecto__media-imagen"
    ),
  ];

  piezasParallax = candidatas
    .filter((el) => getComputedStyle(el).objectFit === "cover")
    .map((el) => ({ el, escala: 1 }));

  if (!piezasParallax.length) return;

  medirPiezas();
  actualizarParallax();

  window.addEventListener("scroll", pedirCuadro, { passive: true });
  window.addEventListener("resize", medirPiezas, { passive: true });
  limpiezas.push(() => {
    window.removeEventListener("scroll", pedirCuadro);
    window.removeEventListener("resize", medirPiezas);
    piezasParallax.forEach((p) => {
      p.el.style.transform = "";
    });
    piezasParallax = [];
  });
}

// -- 3. IMÁN EN LOS BOTONES ---------------------------------------------
//
// El botón se corre unos píxeles hacia el puntero cuando el mouse anda
// cerca. Solo con mouse; en pantallas táctiles no existe.

const IMAN_MAXIMO = 6; // px

function iniciarIman() {
  if (pideQuieto() || !tieneMouse()) return;
  const fuerza = leerNumero("--iman-fuerza", 0);
  if (fuerza <= 0) return;

  const botones = document.querySelectorAll(
    ".header__contacto, .proyecto__enlace-externo a"
  );

  botones.forEach((boton) => {
    const mover = (evento) => {
      const caja = boton.getBoundingClientRect();
      const dx = (evento.clientX - (caja.left + caja.width / 2)) * fuerza;
      const dy = (evento.clientY - (caja.top + caja.height / 2)) * fuerza;
      const limita = (n) => Math.max(-IMAN_MAXIMO, Math.min(IMAN_MAXIMO, n));
      boton.style.transform = `translate3d(${limita(dx).toFixed(1)}px, ${limita(dy).toFixed(1)}px, 0)`;
    };
    const soltar = () => {
      boton.style.transform = "";
    };
    boton.addEventListener("pointermove", mover);
    boton.addEventListener("pointerleave", soltar);
    limpiezas.push(() => {
      boton.removeEventListener("pointermove", mover);
      boton.removeEventListener("pointerleave", soltar);
      soltar();
    });
  });
}

// -- 4. FRANJA DE TEXTO EN LOOP -----------------------------------------
//
// Cierra la home. El texto sale de contenido.json ("home.franja") y se
// repite dos veces adentro: esa es la condición para que el loop no tenga
// un salto visible (ver la explicación del keyframe en animaciones.css).
// Va marcada como decorativa para que un lector de pantalla no lea la
// misma frase dos veces.

export function montarFranja(texto) {
  const grilla = document.querySelector("[data-grilla-proyectos]");
  if (!grilla || !texto) return;

  let franja = document.querySelector(".franja-movil");
  if (!franja) {
    franja = document.createElement("div");
    franja.className = "franja-movil";
    franja.setAttribute("aria-hidden", "true");
    const pista = document.createElement("div");
    pista.className = "franja-movil__pista";
    pista.append(
      document.createElement("span"),
      document.createElement("span")
    );
    pista.children[0].className = "franja-movil__texto";
    pista.children[1].className = "franja-movil__texto";
    franja.appendChild(pista);
    grilla.insertAdjacentElement("afterend", franja);
  }

  // La frase se repite varias veces dentro de cada copia para que la banda
  // nunca quede con un hueco vacío en pantallas anchas.
  const repetida = Array(4).fill(texto).join("  ·  ") + "  ·  ";
  franja.querySelectorAll(".franja-movil__texto").forEach((span) => {
    span.textContent = repetida;
  });
}

// -- Arranque y limpieza -------------------------------------------------

// La home hace una entrada un poco más armada la primera vez que se
// visita: logo, navegación y después la grilla. Si volvés desde un
// proyecto, no se repite (sería cansador).
function retrasoDeIntro() {
  if (document.body.dataset.pagina !== "home") return 0;
  try {
    if (sessionStorage.getItem("intro-vista")) return 0;
    sessionStorage.setItem("intro-vista", "1");
  } catch (e) {
    return 0; // sin sessionStorage, simplemente no hay intro
  }
  return leerNumero("--paso-stagger", 60);
}

export function iniciarMovimiento() {
  envolverTitulo(document.querySelector("[data-proyecto-titulo]"));
  prepararRevelado({ retrasoInicial: retrasoDeIntro() });
  redDeSeguridadDelRevelado();
  iniciarParallax();
  iniciarIman();
}

// Después de cambiar de idioma, parte del contenido se vuelve a armar
// (la media y la galería de los proyectos): esos elementos son nuevos y
// hay que volver a prepararlos. Los que ya entraron no se tocan.
export function reescanear() {
  envolverTitulo(document.querySelector("[data-proyecto-titulo]"));
  prepararRevelado();
}

// Al salir de la página se sueltan los listeners y el observador.
window.addEventListener("pagehide", () => {
  limpiezas.forEach((limpiar) => limpiar());
  limpiezas.length = 0;
  observador = null;
});
