// contenido.js — carga data/contenido.json y resuelve rutas de assets
// desde cualquier página, sin importar en qué carpeta esté.

// La raíz del sitio se calcula a partir de la ubicación de este archivo
// (siempre en /js/contenido.js), así que funciona igual desde index.html
// como desde proyectos/proyecto-1.html.
const RAIZ_SITIO = new URL("../", import.meta.url);

let promesaContenido = null;

// Descarga data/contenido.json una sola vez por carga de página
// (llamadas siguientes reciben la misma promesa ya resuelta).
//
// cache: "no-cache" NO desactiva el caché: obliga al navegador a
// preguntarle al servidor si el archivo cambió antes de usar su copia
// guardada. Hace falta porque GitHub Pages sirve este JSON con
// "Cache-Control: max-age=600", y sin esto el navegador se queda hasta
// 10 minutos mostrando los textos viejos después de cada actualización.
// Si no cambió, el servidor responde 304 y no se descarga nada, así que
// no cuesta ancho de banda.
export function cargarContenido() {
  if (!promesaContenido) {
    const url = new URL("data/contenido.json", RAIZ_SITIO);
    promesaContenido = fetch(url, { cache: "no-cache" }).then((respuesta) => {
      if (!respuesta.ok) {
        throw new Error(`No se pudo cargar contenido.json (${respuesta.status})`);
      }
      return respuesta.json();
    });
  }
  return promesaContenido;
}

// Convierte una ruta relativa a la raíz del sitio (ej: "assets/img/foto.jpg")
// en una URL absoluta válida sin importar la carpeta actual.
export function resolverRuta(rutaRelativa) {
  return new URL(rutaRelativa, RAIZ_SITIO).href;
}

// Busca un valor anidado dentro de un objeto usando una ruta con puntos,
// ej: obtenerValor(contenido, "about.presentacion")
export function obtenerValor(objeto, ruta) {
  return ruta.split(".").reduce((actual, clave) => actual?.[clave], objeto);
}
