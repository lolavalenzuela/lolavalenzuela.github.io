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

export function inicializarTransiciones() {
  activarInterceptorDeSalida();
  animarEntradaSiCorresponde();
}
