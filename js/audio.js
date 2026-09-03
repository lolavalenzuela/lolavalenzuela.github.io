// audio.js — GESTOR ÚNICO DE SONIDO PARA TODO EL SITIO
//
// Regla de oro: un solo lugar decide qué video suena. Nadie toca
// "video.muted" por su cuenta. El botón rojo, el scroll, el cambio de
// idioma y la navegación le piden algo a este gestor, y el gestor
// sincroniza todo de una: mutea los que no corresponden y repinta los
// botones. Por eso el ícono no puede mentir nunca: no hay un estado
// visual por un lado y un estado real por otro, hay uno solo.
//
// Qué resuelve, en concreto:
//   · Que mutear mutee de verdad (antes había dos caminos que peleaban).
//   · Que nunca suenen dos videos a la vez, ni en la misma página ni al
//     volver atrás con la flecha del navegador.
//   · Que al salir de la página no quede audio fantasma sonando.

const registrados = new Map(); // video -> { boton, textos, alVolumen }
let sonando = null; // el ÚNICO video desmuteado en todo el sitio, o null

const ICONOS = {
  // Altavoz tachado (está muteado: tocá para escuchar)
  mudo: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.6 3l2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4-2.7-2.7z"/>',
  // Altavoz con ondas (suena: tocá para silenciar)
  sonando:
    '<path d="M3 9v6h4l5 5V4L7 9H3zm11.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM12 2v2.1a7.5 7.5 0 0 1 0 15.8V22a9.5 9.5 0 0 0 0-20z"/>',
};

// Repinta un botón a partir del estado REAL del elemento <video>, nunca a
// partir de lo que creemos que debería ser.
function pintar(video, estado) {
  const { boton, textos } = estado;
  if (!boton) return;
  const mudo = video.muted;
  boton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${
    mudo ? ICONOS.mudo : ICONOS.sonando
  }</svg>`;
  const etiqueta = mudo ? textos.activar : textos.silenciar;
  boton.setAttribute("aria-label", etiqueta);
  boton.title = etiqueta;
  boton.setAttribute("aria-pressed", String(!mudo));
}

// Deja el mundo consistente: suena "sonando" y nada más.
function aplicar() {
  registrados.forEach((estado, video) => {
    const debeSonar = video === sonando;
    if (video.muted !== !debeSonar) video.muted = !debeSonar;
    pintar(video, estado);
  });
}

// Registra un video con sonido. Arranca SIEMPRE muteado: los navegadores
// bloquean el autoplay con audio, así que fingir otra cosa solo genera
// un botón que dice una cosa y un video que hace otra.
export function registrar(video, boton, textos) {
  if (registrados.has(video)) {
    registrados.get(video).textos = textos;
    pintar(video, registrados.get(video));
    return;
  }
  const estado = { boton, textos, alVolumen: null };
  // Red de seguridad: si "muted" cambia por fuera del gestor (el propio
  // navegador lo hace en algunos casos), el botón se entera igual.
  estado.alVolumen = () => {
    if (video.muted && sonando === video) sonando = null;
    pintar(video, estado);
  };
  video.addEventListener("volumechange", estado.alVolumen);
  registrados.set(video, estado);
  video.muted = true;
  pintar(video, estado);
}

// Cambiar de idioma no remonta el video, solo cambia los textos.
export function actualizarTextos(video, textos) {
  const estado = registrados.get(video);
  if (!estado) return;
  estado.textos = textos;
  pintar(video, estado);
}

// El click del botón (y el click en el video). Si este video ya sonaba,
// se apaga; si no, se enciende y CUALQUIER otro que estuviera sonando se
// mutea solo, sin importar de qué proyecto sea.
export function alternar(video) {
  sonando = sonando === video ? null : video;
  aplicar();
  if (sonando === video) video.play().catch(() => {});
}

// Apagar un video puntual sin tocar los demás.
export function silenciar(video) {
  if (sonando !== video) return;
  sonando = null;
  aplicar();
}

// Cortar el sonido de todo, dejando los videos registrados y sus botones
// funcionando (se usa al volver desde la caché de atrás/adelante).
export function detenerTodo() {
  sonando = null;
  registrados.forEach((estado, video) => {
    video.muted = true;
    pintar(video, estado);
  });
}

// Desmontar un video: se va de la página o lo reemplaza un re-render.
// Pausar además de mutear importa: un <video> que se saca del DOM sin
// pausar sigue reproduciéndose y sigue sonando. Eso era el audio fantasma.
export function olvidar(video) {
  const estado = registrados.get(video);
  if (!estado) return;
  video.removeEventListener("volumechange", estado.alVolumen);
  registrados.delete(video);
  if (sonando === video) sonando = null;
  video.muted = true;
  try {
    video.pause();
  } catch (e) {
    /* un video ya descartado puede tirar error acá; no importa */
  }
}

// Desmontar todo. Se llama antes de volver a armar el contenido.
export function limpiar() {
  Array.from(registrados.keys()).forEach(olvidar);
  sonando = null;
}

// -- Cortes automáticos ------------------------------------------------
// "pagehide" es el evento que hay que escuchar y no "unload": es el único
// que dispara también cuando el navegador se guarda la página en su caché
// de atrás/adelante (bfcache). Sin esto, al volver con la flecha el video
// revive justo donde estaba, sonando, y se superpone con el de la página
// nueva. Es la causa de que se escucharan dos a la vez.
window.addEventListener("pagehide", detenerTodo);

// Y si la página vuelve DESDE esa caché, nos aseguramos de que llegue
// callada aunque el navegador haya intentado reanudar la reproducción.
window.addEventListener("pageshow", (evento) => {
  if (evento.persisted) detenerTodo();
});
