// transiciones.js — transición de la imagen de portada (grilla ↔ proyecto)
// entre navegaciones de página completa. El nombre del header NO usa este
// mecanismo: es el mismo tamaño y la misma posición en todas las páginas,
// así que no necesita animarse (ver layout.css / animaciones.css).
//
// Camino principal: View Transitions API entre documentos, activada por
// `@view-transition { navigation: auto; }` en animaciones.css más
// `view-transition-name` en los elementos compartidos (ver layout.css).
// Ahí el navegador hace todo el trabajo, este archivo no interviene.
//
// Fallback: si el navegador no soporta la API (Safari, Firefox al momento
// de escribir esto), este módulo intercepta el click en los enlaces
// marcados con [data-transicion], mide la posición del elemento compartido
// ([data-elemento-transicion] con el mismo nombre) antes de navegar, la
// guarda, navega normalmente, y en la página de destino anima ese mismo
// elemento desde la posición guardada hasta su lugar final con la Web
// Animations API (técnica FLIP). Si algo falla en el camino, se navega
// igual sin animación: el sitio nunca se rompe ni queda en blanco.

const CLAVE_STORAGE = "flip-pendiente";

function soportaViewTransitions() {
  return "startViewTransition" in document;
}

function leerVariable(nombre, valorPorDefecto) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return valor || valorPorDefecto;
}

function guardarRectPendiente(nombreTransicion, rect) {
  try {
    sessionStorage.setItem(
      CLAVE_STORAGE,
      JSON.stringify({
        nombre: nombreTransicion,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    );
  } catch {
    // Sin sessionStorage: seguimos con la navegación normal, sin animar.
  }
}

function leerYLimpiarRectPendiente() {
  try {
    const crudo = sessionStorage.getItem(CLAVE_STORAGE);
    if (!crudo) return null;
    sessionStorage.removeItem(CLAVE_STORAGE);
    return JSON.parse(crudo);
  } catch {
    return null;
  }
}

// Intercepta los links salientes que disparan una transición compartida.
function activarInterceptorDeSalida() {
  if (soportaViewTransitions()) return; // el navegador ya lo resuelve solo

  document.querySelectorAll("a[data-transicion]").forEach((enlace) => {
    enlace.addEventListener("click", (evento) => {
      // Clicks con modificador (abrir en pestaña nueva, etc.) siguen igual.
      if (evento.defaultPrevented || evento.button !== 0) return;
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

      const nombreTransicion = enlace.dataset.transicion;
      const origen = document.querySelector(
        `[data-elemento-transicion="${nombreTransicion}"]`
      );
      if (!origen) return; // no hay elemento compartido: navegación normal

      evento.preventDefault();
      guardarRectPendiente(nombreTransicion, origen.getBoundingClientRect());
      window.location.href = enlace.href;
    });
  });
}

// En la página de destino, si hay una transición pendiente, anima el
// elemento compartido desde la posición guardada (FLIP) y hace un fade-in
// suave del resto del contenido.
function animarEntradaSiCorresponde() {
  const main = document.querySelector("main");
  // Este script blindaje-anti-flash (ver <head> de cada página) puso esta
  // clase para ocultar <main> hasta que sepamos si hay que animar algo.
  const habiaClaseAntiFlash = document.documentElement.classList.contains(
    "js-flip-pendiente"
  );
  document.documentElement.classList.remove("js-flip-pendiente");

  if (soportaViewTransitions()) {
    return; // el navegador ya resuelve todo, incluido el fade del root
  }

  const pendiente = leerYLimpiarRectPendiente();
  const duracion = parseFloat(leerVariable("--dur-lenta", "600")) || 600;
  const curva = leerVariable("--ease-suave", "cubic-bezier(0.22, 1, 0.36, 1)");

  if (pendiente) {
    const destino = document.querySelector(
      `[data-elemento-transicion="${pendiente.nombre}"]`
    );
    if (destino) {
      const rectFinal = destino.getBoundingClientRect();
      const escalaX = pendiente.width / rectFinal.width;
      const escalaY = pendiente.height / rectFinal.height;
      const trasladoX = pendiente.left - rectFinal.left;
      const trasladoY = pendiente.top - rectFinal.top;

      destino.animate(
        [
          {
            transform: `translate(${trasladoX}px, ${trasladoY}px) scale(${escalaX}, ${escalaY})`,
          },
          { transform: "none" },
        ],
        { duration: duracion, easing: curva, fill: "both" }
      );
    }
  }

  // Cross-fade simple del resto del contenido (equivalente al root
  // crossfade que hace la View Transitions API de forma nativa).
  if (habiaClaseAntiFlash && main) {
    main.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: duracion * 0.7,
      easing: "ease-out",
    });
  }
}

// -----------------------------------------------------------------
// Elemento compartido en navegadores CON View Transitions.
//
// El nombre del header ya se transforma solo, porque lleva un
// view-transition-name fijo en el CSS. Con las imágenes no se puede hacer
// lo mismo: en la home hay seis, y solo la que se clickeó tiene que
// participar de la transición. Por eso el nombre se asigna al vuelo, justo
// antes de que el navegador saque la "foto" de la página que se va
// (pageswap) y de la que llega (pagereveal), y se saca enseguida después.
//
// Como la portada de la home y la imagen principal del proyecto son
// imágenes DISTINTAS, el navegador hace un cross-fade entre las dos
// mientras el recuadro crece o se achica: no hay salto brusco.
//
// Si el navegador no soporta estos eventos, no se hace nada y la
// navegación sigue funcionando igual (con el fallback FLIP de más arriba).
const NOMBRE_COMPARTIDO = "imagen-compartida";

function idDeProyectoEnURL(url) {
  const coincidencia = url?.pathname.match(/proyecto-(\d+)\.html$/);
  return coincidencia ? `proyecto-${coincidencia[1]}` : null;
}

// Devuelve la imagen que participa de la transición en ESTA página,
// según cuál sea la otra punta de la navegación.
function imagenCompartida(idProyecto) {
  if (!idProyecto) return null;
  return document.querySelector(`[data-elemento-transicion="imagen-${idProyecto}"]`);
}

function marcarTemporalmente(elemento) {
  if (!elemento) return;
  elemento.style.viewTransitionName = NOMBRE_COMPARTIDO;
  // Se limpia en cuanto el navegador terminó de capturar, para no dejar el
  // nombre puesto (dos elementos con el mismo nombre romperían la próxima
  // transición).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      elemento.style.viewTransitionName = "";
    });
  });
}

function activarElementoCompartido() {
  if (!("startViewTransition" in document)) return;

  // Página que se va: marca la imagen que corresponde al destino.
  window.addEventListener("pageswap", (evento) => {
    if (!evento.viewTransition) return;
    const urlDestino = evento.activation?.entry?.url;
    if (!urlDestino) return;
    const propio = document.body.dataset.proyectoId;
    // Desde la home hacia un proyecto: la portada clickeada.
    // Desde un proyecto hacia la home u otro proyecto: la imagen principal.
    const id = idDeProyectoEnURL(new URL(urlDestino)) || propio;
    marcarTemporalmente(imagenCompartida(id));
  });

  // Página que llega: marca su contraparte antes del primer pintado.
  window.addEventListener("pagereveal", (evento) => {
    if (!evento.viewTransition) return;
    // "navigation" es la Navigation API. Se consulta con typeof porque en
    // los navegadores que no la implementan la variable no existe y
    // nombrarla directamente lanzaría un ReferenceError (el ?. no protege
    // contra identificadores no declarados).
    const urlOrigen =
      typeof navigation !== "undefined" ? navigation.activation?.from?.url : null;
    const propio = document.body.dataset.proyectoId;
    const id = propio || (urlOrigen ? idDeProyectoEnURL(new URL(urlOrigen)) : null);
    marcarTemporalmente(imagenCompartida(id));
  });
}

export function inicializarTransiciones() {
  activarElementoCompartido();
  activarInterceptorDeSalida();
  animarEntradaSiCorresponde();
}
