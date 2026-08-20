// contacto.js — overlay de contacto: abrir/cerrar, click afuera, Escape,
// y foco atrapado dentro del overlay mientras está abierto.

export function inicializarContacto() {
  const disparador = document.querySelector("[data-abrir-contacto]");
  const overlay = document.querySelector("[data-overlay-contacto]");
  if (!disparador || !overlay) return;

  const botonCerrar = overlay.querySelector("[data-cerrar-contacto]");
  let elementoAnterior = null;

  // Busca en todo el overlay (no solo en el panel): el botón cerrar es
  // "position: fixed" a la esquina de la pantalla y por eso es hermano del
  // panel en el HTML, no hijo — pero igual tiene que quedar atrapado en el
  // ciclo de foco.
  function elementosFocables() {
    return overlay.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }

  function abrir() {
    elementoAnterior = document.activeElement;
    overlay.hidden = false;
    // Un frame para que la transición de opacidad/transform se dispare.
    requestAnimationFrame(() => overlay.classList.add("js-visible"));
    document.addEventListener("keydown", alManejarTeclado);
    const primero = elementosFocables()[0];
    primero?.focus();
  }

  function cerrar() {
    overlay.classList.remove("js-visible");
    document.removeEventListener("keydown", alManejarTeclado);
    const alTerminar = () => {
      overlay.hidden = true;
      overlay.removeEventListener("transitionend", alTerminar);
    };
    overlay.addEventListener("transitionend", alTerminar);
    elementoAnterior?.focus();
  }

  function alManejarTeclado(evento) {
    if (evento.key === "Escape") {
      cerrar();
      return;
    }
    if (evento.key !== "Tab") return;

    // Atrapa el foco dentro del panel (ciclo simple primero/último).
    const focables = Array.from(elementosFocables());
    if (focables.length === 0) return;
    const primero = focables[0];
    const ultimo = focables[focables.length - 1];

    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  disparador.addEventListener("click", abrir);
  botonCerrar?.addEventListener("click", cerrar);
  overlay.addEventListener("click", (evento) => {
    if (evento.target === overlay) cerrar();
  });
}
