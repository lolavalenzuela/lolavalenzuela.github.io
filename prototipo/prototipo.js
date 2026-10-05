// prototipo.js — el movimiento de la maqueta.
//
// Cuatro gestos, nada más:
//   1. BARRIDO   — una cortina roja descubre cada portada al entrar.
//   2. DESFASAJE — texto e imagen se mueven a distinta velocidad al scrollear.
//   3. CICLO     — la tira de disciplinas, que nunca para.  (está en el CSS)
//   4. FOCO      — al apuntar un proyecto, los demás se apagan. (está en el CSS)
//
// Todo lo que se calibra está en prototipo.css, arriba de todo.

const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const conMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// -- Entrada de la portada ----------------------------------------------
// Se dispara en el cuadro siguiente para que el navegador alcance a pintar
// el estado inicial y la transición se vea.
requestAnimationFrame(() => {
  requestAnimationFrame(() => document.body.classList.add("js-entrada"));
});

// -- 1. Revelado al entrar en pantalla ----------------------------------
// Cada proyecto revela su texto escalonado y descubre su portada con el
// barrido. Una sola vez.

const paso = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--paso")) || 90;

function revelarProyecto(proyecto) {
  const partes = proyecto.querySelectorAll(".mov");
  partes.forEach((parte, i) => {
    parte.style.setProperty("--retraso", `${i * paso}ms`);
    parte.classList.add("visible");
  });
  proyecto.classList.add("visible");
}

const proyectos = document.querySelectorAll(".proyecto");

if (typeof IntersectionObserver === "undefined") {
  // Navegador sin soporte: se muestra todo, sin animación.
  proyectos.forEach(revelarProyecto);
} else {
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        revelarProyecto(entrada.target);
        observador.unobserve(entrada.target);
      });
    },
    // Empieza cuando el bloque ya entró un poco: así el barrido se ve.
    { rootMargin: "0px 0px -15% 0px", threshold: 0.01 }
  );
  proyectos.forEach((p) => observador.observe(p));

  // Red de seguridad: si por lo que sea el observador no avisara, a los dos
  // segundos se muestra lo que esté a la vista. Nunca queda nada invisible.
  setTimeout(() => {
    proyectos.forEach((p) => {
      const caja = p.getBoundingClientRect();
      if (caja.top < window.innerHeight && caja.bottom > 0) revelarProyecto(p);
    });
  }, 2000);
}

// -- 2. Desfasaje al scrollear ------------------------------------------
// El texto va más lento que la imagen. Son pocos píxeles: tiene que notarse
// como profundidad, no como un efecto.

const desfase = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--desfase")) || 60;
let pendiente = false;

function moverDesfase() {
  pendiente = false;
  const mitad = window.innerHeight / 2;
  proyectos.forEach((proyecto) => {
    const caja = proyecto.getBoundingClientRect();
    if (caja.bottom < -100 || caja.top > window.innerHeight + 100) return;
    // -1 cuando el bloque viene subiendo, +1 cuando ya pasó.
    const avance = (mitad - (caja.top + caja.height / 2)) / window.innerHeight;
    const texto = proyecto.querySelector(".proyecto__texto");
    const imagen = proyecto.querySelector(".proyecto__imagen");
    if (texto) texto.style.transform = `translate3d(0, ${(avance * desfase).toFixed(1)}px, 0)`;
    if (imagen) imagen.style.setProperty("--desfase-y", `${(avance * -desfase * 0.5).toFixed(1)}px`);
  });
}

function pedirCuadro() {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(moverDesfase);
}

if (!quieto) {
  moverDesfase();
  window.addEventListener("scroll", pedirCuadro, { passive: true });
  window.addEventListener("resize", pedirCuadro, { passive: true });
}

// -- Cabecera: la marca aparece recién cuando pasás la portada ----------
const cabecera = document.querySelector(".cabecera");
const portada = document.querySelector(".portada");

if (cabecera && portada && typeof IntersectionObserver !== "undefined") {
  new IntersectionObserver(
    ([entrada]) => cabecera.classList.toggle("compacta", !entrada.isIntersecting),
    { threshold: 0.15 }
  ).observe(portada);
}

// -- 3. Cursor en cruz ---------------------------------------------------
// Solo con mouse y solo si no se pidió menos movimiento. Sigue al puntero
// con un pequeño retardo, para que se sienta vivo y no pegado.

if (conMouse && !quieto) {
  const cruz = document.querySelector(".cruz");
  document.body.classList.add("con-cruz");

  let xObjetivo = window.innerWidth / 2;
  let yObjetivo = window.innerHeight / 2;
  let x = xObjetivo;
  let y = yObjetivo;

  window.addEventListener(
    "pointermove",
    (evento) => {
      xObjetivo = evento.clientX;
      yObjetivo = evento.clientY;
      // Sobre un link la cruz se abre y se pone roja.
      cruz.classList.toggle("sobre-link", Boolean(evento.target.closest("a")));
    },
    { passive: true }
  );

  (function seguir() {
    // Interpolación simple: se acerca un 18% por cuadro.
    x += (xObjetivo - x) * 0.18;
    y += (yObjetivo - y) * 0.18;
    cruz.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    requestAnimationFrame(seguir);
  })();
}
