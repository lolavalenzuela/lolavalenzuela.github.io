// idioma.js — toggle es/en: guarda la preferencia, aplica textos estáticos
// marcados con data-i18n y avisa a quien se suscriba para que re-renderice
// el contenido dinámico de la página (grilla, about, ficha de proyecto).

import { obtenerValor } from "./contenido.js";

const CLAVE_STORAGE = "idioma";
const IDIOMA_POR_DEFECTO = "es";

// Lee el idioma guardado en esta sesión. Si sessionStorage no está
// disponible (modo privado, restricciones del navegador) degrada
// silenciosamente al idioma por defecto.
export function obtenerIdioma() {
  try {
    return sessionStorage.getItem(CLAVE_STORAGE) || IDIOMA_POR_DEFECTO;
  } catch {
    return IDIOMA_POR_DEFECTO;
  }
}

function guardarIdioma(idioma) {
  try {
    sessionStorage.setItem(CLAVE_STORAGE, idioma);
  } catch {
    // Sin sessionStorage disponible: el idioma no persiste entre páginas,
    // pero el sitio sigue funcionando con el valor por defecto.
  }
}

// Aplica los textos estáticos: cualquier elemento con data-i18n="ruta.clave"
// recibe el texto correspondiente de contenido[idioma].
export function aplicarTextosEstaticos(contenido, idioma) {
  document.documentElement.lang = idioma;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const valor = obtenerValor(contenido[idioma], el.dataset.i18n);
    if (typeof valor === "string") {
      el.textContent = valor;
    }
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    // Formato: data-i18n-attr="href:contacto.mail,aria-label:nav.contacto"
    el.dataset.i18nAttr.split(",").forEach((par) => {
      const [atributo, ruta] = par.split(":").map((s) => s.trim());
      const valor = obtenerValor(contenido[idioma], ruta);
      if (typeof valor === "string") {
        el.setAttribute(atributo, valor);
      }
    });
  });

  const meta = document.querySelector('meta[name="description"]');
  const metaClave = meta?.dataset.i18n;
  if (meta && metaClave) {
    const valor = obtenerValor(contenido[idioma], metaClave);
    if (typeof valor === "string") meta.setAttribute("content", valor);
  }

  const tituloClave = document.body.dataset.tituloI18n;
  if (tituloClave) {
    const valor = obtenerValor(contenido[idioma], tituloClave);
    if (typeof valor === "string") document.title = valor;
  }
}

// Engancha los botones del toggle "es / en" del header.
// onCambiar(nuevoIdioma) se llama después de guardar y marcar el toggle.
export function inicializarToggleIdioma(onCambiar) {
  const botones = document.querySelectorAll("[data-idioma-boton]");

  function marcarActivo(idioma) {
    botones.forEach((boton) => {
      boton.setAttribute("aria-current", String(boton.dataset.idiomaBoton === idioma));
    });
  }

  botones.forEach((boton) => {
    boton.addEventListener("click", () => {
      const nuevoIdioma = boton.dataset.idiomaBoton;
      if (nuevoIdioma === obtenerIdioma()) return;
      guardarIdioma(nuevoIdioma);
      marcarActivo(nuevoIdioma);
      onCambiar(nuevoIdioma);
    });
  });

  marcarActivo(obtenerIdioma());
}
