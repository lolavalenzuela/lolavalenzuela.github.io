// main.js — punto de entrada. Carga contenido.json, arma el contenido
// dinámico de cada tipo de página (home / about / proyecto) y conecta
// idioma, contacto y transiciones.

import { cargarContenido, resolverRuta } from "./contenido.js";
import { obtenerIdioma, aplicarTextosEstaticos, inicializarToggleIdioma } from "./idioma.js";
import { inicializarContacto } from "./contacto.js";
import { inicializarTransiciones } from "./transiciones.js";

const NUMERO_DE_BLOQUE = { 0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6" };

function crearBloqueProyecto(proyecto, indice) {
  const numeroBloque = NUMERO_DE_BLOQUE[indice];
  const nombreTransicion = `imagen-${proyecto.id}`;

  const enlace = document.createElement("a");
  enlace.className = "bloque-proyecto";
  enlace.dataset.bloque = numeroBloque;
  enlace.dataset.proyectoId = proyecto.id;
  enlace.dataset.transicion = nombreTransicion;
  enlace.href = `proyectos/${proyecto.id}.html`;

  const imagen = document.createElement("img");
  imagen.className = "bloque-proyecto__imagen";
  imagen.dataset.elementoTransicion = nombreTransicion;
  imagen.loading = "lazy";
  imagen.decoding = "async";
  imagen.src = resolverRuta(proyecto.imagen);
  imagen.alt = proyecto.altImagen;
  // Encuadre configurable por proyecto desde contenido.json (ver la nota
  // "_ayudaEncuadre" ahí). Sin valor, manda el "center" del CSS.
  if (proyecto.encuadre) imagen.style.objectPosition = proyecto.encuadre;

  const titulo = document.createElement("span");
  titulo.className = "bloque-proyecto__titulo";
  titulo.textContent = proyecto.titulo;

  enlace.append(imagen, titulo);
  return enlace;
}

function renderHome(contenido, idioma) {
  const grilla = document.querySelector("[data-grilla-proyectos]");
  if (!grilla) return;

  const proyectos = contenido[idioma].home.proyectos;

  if (!grilla.dataset.construida) {
    // Primer render: arma la estructura completa (3 columnas de 2 bloques).
    grilla.innerHTML = "";
    for (let col = 0; col < 3; col++) {
      const columna = document.createElement("div");
      columna.className = "grilla-proyectos__columna";
      const item1 = proyectos[col * 2];
      const item2 = proyectos[col * 2 + 1];
      columna.append(
        crearBloqueProyecto(item1, col * 2),
        crearBloqueProyecto(item2, col * 2 + 1)
      );
      grilla.appendChild(columna);
    }
    grilla.dataset.construida = "true";
    grilla.classList.add("js-lista-para-animar");
    return;
  }

  // Idioma cambiado: solo actualiza textos e imágenes, no reconstruye el DOM
  // (así no se repite la animación de entrada ni se pierde el estado de hover).
  proyectos.forEach((proyecto) => {
    const bloque = grilla.querySelector(`[data-proyecto-id="${proyecto.id}"]`);
    if (!bloque) return;
    bloque.querySelector(".bloque-proyecto__titulo").textContent = proyecto.titulo;
    const img = bloque.querySelector(".bloque-proyecto__imagen");
    img.alt = proyecto.altImagen;
    img.src = resolverRuta(proyecto.imagen);
    if (proyecto.encuadre) img.style.objectPosition = proyecto.encuadre;
  });
}

function renderListaSimple(selector, items) {
  const lista = document.querySelector(selector);
  if (!lista) return;
  lista.innerHTML = "";
  items.forEach((texto) => {
    const li = document.createElement("li");
    li.textContent = texto;
    lista.appendChild(li);
  });
}

function renderAbout(contenido, idioma) {
  const about = contenido[idioma].about;

  const foto = document.querySelector("[data-about-foto]");
  if (foto) {
    foto.src = resolverRuta(about.foto);
    foto.alt = about.fotoAlt;
  }

  renderListaSimple("[data-lista='educacion']", about.educacion);
  renderListaSimple("[data-lista='herramientas']", about.herramientas);
}

// Cada dato de la ficha va envuelto en un <div> para que sea una columna
// entera de la grilla (etiqueta arriba, valor abajo). Un <div> agrupando
// dt+dd dentro de un <dl> es HTML válido.
function crearFichaItem(etiqueta, valor) {
  const grupo = document.createElement("div");
  grupo.className = "proyecto__ficha-item";

  const dt = document.createElement("dt");
  dt.textContent = etiqueta;
  const dd = document.createElement("dd");
  dd.textContent = valor;

  grupo.append(dt, dd);
  return grupo;
}

function renderProyecto(contenido, idioma) {
  const id = document.body.dataset.proyectoId;
  const datos = contenido[idioma].proyectos[id];
  const etiquetas = contenido[idioma].proyecto;
  if (!datos) return;

  document.title = `${datos.titulo} — Lola Valenzuela`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", datos.descripcion);

  const titulo = document.querySelector("[data-proyecto-titulo]");
  if (titulo) titulo.textContent = datos.titulo;

  const descripcion = document.querySelector("[data-proyecto-descripcion]");
  if (descripcion) descripcion.textContent = datos.descripcion;

  // Imagen principal o video: si hay video, la imagen principal no se usa.
  const wrapperImagen = document.querySelector("[data-proyecto-imagen-wrapper]");
  const wrapperVideo = document.querySelector("[data-proyecto-video-wrapper]");
  const nombreTransicion = `imagen-${id}`;

  if (datos.video) {
    wrapperImagen?.setAttribute("hidden", "");
    wrapperVideo?.removeAttribute("hidden");
    const iframe = wrapperVideo?.querySelector("iframe");
    if (iframe && iframe.src !== datos.video) iframe.src = datos.video;
  } else {
    wrapperVideo?.setAttribute("hidden", "");
    wrapperImagen?.removeAttribute("hidden");
    const imagenPrincipal = document.querySelector("[data-proyecto-imagen-principal]");
    if (imagenPrincipal) {
      imagenPrincipal.src = resolverRuta(datos.imagenPrincipal);
      imagenPrincipal.alt = datos.altPrincipal;
      imagenPrincipal.decoding = "async";
      imagenPrincipal.dataset.elementoTransicion = nombreTransicion;
    }
  }

  // Audio (opcional): reproductor nativo, solo si el proyecto trae uno.
  const wrapperAudio = document.querySelector("[data-proyecto-audio-wrapper]");
  if (wrapperAudio) {
    if (datos.audio) {
      wrapperAudio.removeAttribute("hidden");
      const audio = wrapperAudio.querySelector("audio");
      if (audio && audio.getAttribute("src") !== datos.audio) {
        audio.setAttribute("src", resolverRuta(datos.audio));
      }
    } else {
      wrapperAudio.setAttribute("hidden", "");
    }
  }

  // Ficha: año / tipo / herramientas
  const ficha = document.querySelector("[data-proyecto-ficha]");
  if (ficha) {
    ficha.innerHTML = "";
    ficha.append(
      crearFichaItem(etiquetas.anioLabel, datos.anio),
      crearFichaItem(etiquetas.tipoLabel, datos.tipo),
      crearFichaItem(etiquetas.herramientasLabel, datos.herramientas.join(" · "))
    );
  }

  // Galería
  const galeria = document.querySelector("[data-proyecto-galeria]");
  if (galeria) {
    galeria.innerHTML = "";
    datos.galeria.forEach((item) => {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = resolverRuta(item.src);
      img.alt = item.alt;
      galeria.appendChild(img);
    });
  }

  // Navegación anterior / siguiente: además del enlace, cada uno muestra el
  // título real del proyecto vecino, sacado del JSON. La flecha (← / →) ya
  // indica la dirección visualmente; el aria-label la deja explícita para
  // quien navegue con lector de pantalla.
  const vecinos = [
    { el: document.querySelector("[data-proyecto-anterior]"),
      id: datos.anteriorId,
      span: "[data-proyecto-anterior-titulo]",
      etiqueta: contenido[idioma].nav.anterior },
    { el: document.querySelector("[data-proyecto-siguiente]"),
      id: datos.siguienteId,
      span: "[data-proyecto-siguiente-titulo]",
      etiqueta: contenido[idioma].nav.siguiente },
  ];

  vecinos.forEach(({ el, id, span, etiqueta }) => {
    if (!el) return;
    el.href = `${id}.html`;
    const tituloVecino = contenido[idioma].proyectos[id]?.titulo;
    if (!tituloVecino) return;
    const destino = el.querySelector(span);
    if (destino) destino.textContent = tituloVecino;
    el.setAttribute("aria-label", `${etiqueta}: ${tituloVecino}`);
  });

  // Enlace "volver a inicio": comparte la transición con el thumbnail
  // correspondiente en la grilla de la home.
  const volver = document.querySelector("[data-proyecto-volver]");
  if (volver) volver.dataset.transicion = nombreTransicion;
}

function crearItemContacto(etiqueta, textoDato, href, esExterno) {
  const li = document.createElement("li");
  li.className = "overlay-contacto__item";

  const etiquetaEl = document.createElement("span");
  etiquetaEl.className = "overlay-contacto__etiqueta";
  etiquetaEl.textContent = etiqueta;

  const datoEl = document.createElement("a");
  datoEl.className = "overlay-contacto__dato";
  datoEl.href = href;
  datoEl.textContent = textoDato;
  if (esExterno) {
    datoEl.target = "_blank";
    datoEl.rel = "noopener";
  }

  li.append(etiquetaEl, datoEl);
  return li;
}

function renderContacto(contenido, idioma) {
  const lista = document.querySelector("[data-contacto-lista]");
  if (!lista) return;
  const datos = contenido[idioma].contacto;

  lista.innerHTML = "";
  lista.append(
    crearItemContacto(datos.mailLabel, datos.mailTexto, datos.mail),
    crearItemContacto(datos.telefonoLabel, datos.telefonoTexto, datos.telefono)
  );

  // Redes sociales: desactivadas por defecto (array vacío). Para activar
  // Instagram/LinkedIn/Behance, ver el comentario junto a "redes" en
  // data/contenido.json — no hace falta tocar este archivo.
  (datos.redes || []).forEach((red) => {
    lista.appendChild(crearItemContacto(red.nombre, red.url, red.url, true));
  });
}

async function iniciar() {
  let contenido;
  try {
    contenido = await cargarContenido();
  } catch (error) {
    console.error("No se pudo cargar el contenido del sitio:", error);
    return;
  }

  let idiomaActual = obtenerIdioma();
  const pagina = document.body.dataset.pagina;

  function render(idioma) {
    aplicarTextosEstaticos(contenido, idioma);
    renderContacto(contenido, idioma);
    if (pagina === "home") renderHome(contenido, idioma);
    if (pagina === "about") renderAbout(contenido, idioma);
    if (pagina === "proyecto") renderProyecto(contenido, idioma);
  }

  render(idiomaActual);

  inicializarToggleIdioma((nuevoIdioma) => {
    const main = document.querySelector("main.js-fade-idioma");
    if (!main) {
      render(nuevoIdioma);
      idiomaActual = nuevoIdioma;
      return;
    }
    main.classList.add("js-idioma-cambiando");
    main.addEventListener(
      "transitionend",
      () => {
        render(nuevoIdioma);
        idiomaActual = nuevoIdioma;
        requestAnimationFrame(() => main.classList.remove("js-idioma-cambiando"));
      },
      { once: true }
    );
  });

  inicializarContacto();
  inicializarTransiciones();
}

iniciar();
