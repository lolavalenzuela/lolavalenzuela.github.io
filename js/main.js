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

// Video de portada: ocupa el mismo recuadro que la imagen principal.
//
// Los navegadores bloquean el autoplay con sonido, así que primero se
// intenta reproducir CON audio (funciona si la persona ya interactuó con
// el sitio) y, si lo rechazan, se cae a muteado. En los dos casos queda
// visible un botón para activar o silenciar, y el video entero es
// clickeable para lo mismo. Con "prefers-reduced-motion" no arranca solo:
// se muestra el póster y se reproduce a pedido.
function montarVideoPortada(hero, datos, textos) {
  const video = document.createElement("video");
  video.className = "proyecto__video-portada";
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.poster = resolverRuta(datos.poster);
  video.width = datos.ancho;
  video.height = datos.alto;
  video.setAttribute("aria-label", datos.alt);
  // El .webm va primero: pesa menos y el navegador que no lo soporte
  // pasa solo al .mp4.
  [["webm", "video/webm"], ["mp4", "video/mp4"]].forEach(([clave, tipo]) => {
    if (!datos[clave]) return;
    const fuente = document.createElement("source");
    fuente.src = resolverRuta(datos[clave]);
    fuente.type = tipo;
    video.appendChild(fuente);
  });

  // ¿Este video lleva control de sonido? Lo decide "audio" en el JSON, no
  // el código: los proyectos sin banda sonora no muestran ningún control
  // ni reaccionan al click. Si la clave falta, se asume que sí tiene
  // audio, para no cambiar el comportamiento de lo ya cargado.
  const tieneAudio = datos.audio !== false;

  if (!tieneAudio) {
    video.muted = true;
    hero.innerHTML = "";
    hero.appendChild(video);
    // Con movimiento reducido queda el póster quieto, sin loop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.preload = "none";
      return video;
    }
    video.play().catch(() => {});
    return video;
  }

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "proyecto__sonido";

  const ICONOS = {
    // Altavoz tachado (está muteado: tocá para escuchar)
    mudo: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.6 3l2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4-2.7-2.7z"/>',
    // Altavoz con ondas (suena: tocá para silenciar)
    sonando: '<path d="M3 9v6h4l5 5V4L7 9H3zm11.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM12 2v2.1a7.5 7.5 0 0 1 0 15.8V22a9.5 9.5 0 0 0 0-20z"/>',
  };

  function pintarBoton() {
    const mudo = video.muted;
    boton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${mudo ? ICONOS.mudo : ICONOS.sonando}</svg>`;
    const etiqueta = mudo ? textos.activarSonido : textos.silenciarSonido;
    boton.setAttribute("aria-label", etiqueta);
    boton.title = etiqueta;
    boton.setAttribute("aria-pressed", String(!mudo));
  }

  function alternarSonido() {
    video.muted = !video.muted;
    if (!video.muted) video.play().catch(() => {});
    pintarBoton();
  }

  boton.addEventListener("click", (evento) => {
    evento.preventDefault();
    evento.stopPropagation();
    alternarSonido();
  });

  // Un click en cualquier parte del video hace lo mismo.
  hero.addEventListener("click", alternarSonido);

  hero.innerHTML = "";
  hero.append(video, boton);
  pintarBoton();

  // Casos en los que NO conviene arrancar solo: si la persona pidió menos
  // movimiento, o si el navegador avisa que está ahorrando datos o que la
  // conexión es lenta (ahí bajar 5 MB de video sin que lo pidan es un
  // abuso). En esos casos queda el póster y el botón lo reproduce.
  const conexion = navigator.connection;
  const ahorroDeDatos = Boolean(conexion?.saveData);
  const conexionLenta = /^(slow-)?2g$/.test(conexion?.effectiveType || "");
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (sinMovimiento || ahorroDeDatos || conexionLenta) {
    video.preload = "none";
    boton.addEventListener(
      "click",
      () => {
        video.muted = false;
        video.play().catch(() => {});
        pintarBoton();
      },
      { once: true }
    );
    return video;
  }

  // Intento con sonido; si el navegador lo rechaza, mute y reintento.
  video.muted = false;
  pintarBoton();
  video.play().catch(() => {
    video.muted = true;
    pintarBoton();
    video.play().catch(() => {});
  });

  return video;
}

// Cada dato de la ficha va envuelto en un <div> para que sea una columna
// entera de la grilla (etiqueta arriba, valor abajo). Un <div> agrupando
// dt+dd dentro de un <dl> es HTML válido.
// Crea un <video> de galería: loop, muteado y sin controles, salvo que la
// pieza declare "audio": true, en cuyo caso reutiliza el mismo control de
// sonido rojo del video de portada.
function crearVideoMedia(pieza, textos) {
  const video = document.createElement("video");
  video.className = "proyecto__media-video";
  video.loop = true;
  video.playsInline = true;
  video.muted = pieza.audio !== true;
  video.preload = "metadata";
  video.poster = resolverRuta(pieza.poster);
  video.width = pieza.ancho;
  video.height = pieza.alto;
  video.setAttribute("aria-label", pieza.alt);
  [["webm", "video/webm"], ["mp4", "video/mp4"]].forEach(([clave, tipo]) => {
    if (!pieza[clave]) return;
    const fuente = document.createElement("source");
    fuente.src = resolverRuta(pieza[clave]);
    fuente.type = tipo;
    video.appendChild(fuente);
  });
  return video;
}

// Media de la sección de abajo, organizada en filas. Cada fila del JSON es
// un array de piezas (imágenes o videos) y se reparte en tantas columnas
// como piezas tenga, así una fila puede llevar una, dos o tres. Cada pieza
// conserva su propia proporción: nada se recorta ni se estira.
//
// Los videos arrancan solos cuando entran en pantalla y se pausan al salir,
// para no tener tres reproduciéndose a la vez ni bajar datos de más.
function renderMedia(contenedor, filas, textos) {
  contenedor.innerHTML = "";
  const hayMedia = Array.isArray(filas) && filas.length > 0;
  contenedor.hidden = !hayMedia;
  if (!hayMedia) return;

  const videos = [];

  filas.forEach((fila) => {
    const divFila = document.createElement("div");
    divFila.className = "proyecto__media-fila";
    divFila.style.setProperty("--columnas", String(fila.length));

    fila.forEach((pieza) => {
      const marco = document.createElement("figure");
      marco.className = "proyecto__media-pieza";
      // Las piezas verticales (video de celular, afiche parado) llevan un
      // tope de ancho: a media columna quedarían altísimas y se comerían
      // la página. Ver la clase en layout.css.
      if (pieza.alto > pieza.ancho) marco.classList.add("proyecto__media-pieza--vertical");
      // La proporción real del archivo reserva el espacio antes de cargar.
      marco.style.setProperty("--proporcion", `${pieza.ancho} / ${pieza.alto}`);

      if (pieza.tipo === "video") {
        const video = crearVideoMedia(pieza, textos);
        marco.appendChild(video);
        videos.push(video);
      } else {
        const img = document.createElement("img");
        img.className = "proyecto__media-imagen";
        img.loading = "lazy";
        img.decoding = "async";
        img.width = pieza.ancho;
        img.height = pieza.alto;
        img.src = resolverRuta(pieza.src);
        img.alt = pieza.alt;
        marco.appendChild(img);
      }

      divFila.appendChild(marco);
    });

    contenedor.appendChild(divFila);
  });

  // Reproducir solo lo que se ve. Si el navegador no soporta
  // IntersectionObserver, o si se pidió menos movimiento, quedan los
  // pósters quietos y no se descarga ningún video.
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (sinMovimiento || typeof IntersectionObserver === "undefined") {
    videos.forEach((v) => { v.preload = "none"; });
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        const v = entrada.target;
        if (entrada.isIntersecting) v.play().catch(() => {});
        else v.pause();
      });
    },
    { rootMargin: "200px 0px" }
  );
  videos.forEach((v) => observador.observe(v));
}

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

  if (datos.videoPortada) {
    // Video propio en el recuadro grande de arriba (mismo espacio que la
    // imagen principal). Se monta una sola vez por carga de página.
    wrapperVideo?.setAttribute("hidden", "");
    wrapperImagen?.removeAttribute("hidden");
    if (wrapperImagen && !wrapperImagen.dataset.videoMontado) {
      const video = montarVideoPortada(wrapperImagen, datos.videoPortada, datos.videoPortada);
      video.dataset.elementoTransicion = nombreTransicion;
      wrapperImagen.dataset.videoMontado = "true";
    } else if (wrapperImagen) {
      // Cambio de idioma: solo se actualizan los textos accesibles.
      const video = wrapperImagen.querySelector("video");
      video?.setAttribute("aria-label", datos.videoPortada.alt);
      const boton = wrapperImagen.querySelector(".proyecto__sonido");
      if (boton && video) {
        const etiqueta = video.muted
          ? datos.videoPortada.activarSonido
          : datos.videoPortada.silenciarSonido;
        boton.setAttribute("aria-label", etiqueta);
        boton.title = etiqueta;
      }
    }
  } else if (datos.video) {
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
      // Medidas reales del archivo: el navegador reserva el espacio antes
      // de que la foto cargue, así la página no salta.
      if (datos.anchoPrincipal) imagenPrincipal.width = datos.anchoPrincipal;
      if (datos.altoPrincipal) imagenPrincipal.height = datos.altoPrincipal;
      // Encuadre: el recuadro de arriba es mucho más apaisado que la foto,
      // así que algo se recorta. "encuadrePrincipal" en el JSON decide qué
      // franja se conserva; si el proyecto no lo define, queda centrada.
      imagenPrincipal.style.objectPosition = datos.encuadrePrincipal || "";
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

  // Enlace externo (sitio publicado). Solo aparece si el proyecto define
  // "enlace" en el JSON; la url es la misma en los dos idiomas y el texto
  // se traduce. Abre en pestaña nueva.
  const enlaceWrapper = document.querySelector("[data-proyecto-enlace-wrapper]");
  const enlaceExterno = document.querySelector("[data-proyecto-enlace]");
  if (enlaceWrapper && enlaceExterno) {
    const tiene = Boolean(datos.enlace?.url);
    enlaceWrapper.hidden = !tiene;
    if (tiene) {
      enlaceExterno.href = datos.enlace.url;
      enlaceExterno.textContent = datos.enlace.texto;
    }
  }

  // Sección de media de abajo. Si el proyecto define "media" (filas con
  // imágenes y videos mezclados), manda eso; si no, se usa la "galeria"
  // clásica de dos columnas. Así conviven los dos formatos sin pisarse.
  const contenedorMedia = document.querySelector("[data-proyecto-media]");
  const usaMedia = Array.isArray(datos.media) && datos.media.length > 0;
  if (contenedorMedia) {
    renderMedia(contenedorMedia, usaMedia ? datos.media : [], contenido[idioma].proyecto);
  }

  // Galería. Si el proyecto no tiene fotos cargadas, el bloque entero se
  // oculta para que no quede un hueco debajo de la descripción. Basta con
  // volver a poner objetos en "galeria" en el JSON para que reaparezca.
  const galeria = document.querySelector("[data-proyecto-galeria]");
  if (galeria) {
    const fotos = Array.isArray(datos.galeria) ? datos.galeria : [];
    const hayFotos = !usaMedia && fotos.length > 0;
    galeria.hidden = !hayFotos;
    galeria.innerHTML = "";
    // El CSS usa estos tres datos: cuántas columnas armar, con qué
    // proporción mostrar cada pieza, y si la pieza entra entera o llena el
    // recuadro recortándose (ver "galeriaColumnas", "galeriaProporcion" y
    // "galeriaAjuste" en el JSON). Si el proyecto no los define, se usa lo
    // de siempre: hasta 3 columnas según cuántas fotos haya, y recorte.
    galeria.dataset.columnas = String(datos.galeriaColumnas || Math.min(fotos.length, 3));
    galeria.dataset.ajuste = datos.galeriaAjuste || "cover";
    if (datos.galeriaProporcion) {
      galeria.style.setProperty("--galeria-proporcion", datos.galeriaProporcion);
    } else {
      galeria.style.removeProperty("--galeria-proporcion");
    }
    fotos.forEach((item) => {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = resolverRuta(item.src);
      img.alt = item.alt;
      // Medidas reales del archivo: reservan el lugar antes de que cargue.
      if (item.ancho) img.width = item.ancho;
      if (item.alto) img.height = item.alto;
      // Click para verla en grande: si la pieza define "grande" en el JSON,
      // la imagen va envuelta en un enlace que abre ese archivo (el PDF
      // original, en tamaño real) en una pestaña nueva. Sin "grande", la
      // pieza no es clickeable y no cambia nada más.
      if (item.grande) {
        const enlace = document.createElement("a");
        enlace.className = "proyecto__galeria-enlace";
        enlace.href = resolverRuta(item.grande);
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        enlace.setAttribute("aria-label", `${item.alt} — ${etiquetas.verGrandeLabel}`);
        enlace.appendChild(img);
        galeria.appendChild(enlace);
      } else {
        galeria.appendChild(img);
      }
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
