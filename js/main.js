// main.js — punto de entrada. Carga contenido.json, arma el contenido
// dinámico de cada tipo de página (home / about / proyecto) y conecta
// idioma, contacto y transiciones.

import { cargarContenido, resolverRuta } from "./contenido.js";
import { obtenerIdioma, aplicarTextosEstaticos, inicializarToggleIdioma } from "./idioma.js";
import { inicializarContacto } from "./contacto.js";
import { inicializarTransiciones } from "./transiciones.js";
import * as gestorAudio from "./audio.js";

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
// El sonido NO se maneja acá: se delega entero en js/audio.js, que es el
// único que decide qué video suena en todo el sitio. Acá solo se arma el
// video, se arma el botón rojo y se los registra en ese gestor.
//
// El video arranca siempre muteado y con el botón visible desde el
// primer momento. No es una decisión de diseño: los navegadores bloquean
// el autoplay con sonido y no hay forma de saltearlo, así que intentar
// arrancar con audio solo produce un botón que miente.
//
// Con "prefers-reduced-motion" no arranca solo: se muestra el póster y se
// reproduce recién cuando la persona toca el botón.
function montarVideoPortada(hero, datos, textos) {
  const video = document.createElement("video");
  video.className = "proyecto__video-portada";
  video.loop = true;
  video.playsInline = true;
  video.muted = true;
  video.preload = "metadata";
  video.poster = resolverRuta(datos.poster);
  video.width = datos.ancho;
  video.height = datos.alto;
  video.setAttribute("aria-label", datos.alt);
  // Encuadre del video dentro del recuadro. Por defecto "cover" (llena el
  // bloque y recorta lo que sobra). Un proyecto puede pedir "contain" en
  // el JSON ("ajustePortada") para que el video entre completo, con negro
  // en lo que sobre: es lo que hace falta cuando la proporción del video
  // no se parece a la del bloque y recortarlo se comería contenido.
  if (datos.ajuste) {
    video.style.objectFit = datos.ajuste;
    // Con "contain" lo que sobra del recuadro se rellena con el negro del
    // sitio, no con el gris de placeholder.
    if (datos.ajuste === "contain") {
      video.classList.add("proyecto__video-portada--completo");
    }
  }
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

  // Motivos para no arrancar solo: movimiento reducido, ahorro de datos o
  // conexión lenta (bajar varios MB de video sin que lo pidan es un abuso).
  const conexion = navigator.connection;
  const arranqueDiferido =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    Boolean(conexion?.saveData) ||
    /^(slow-)?2g$/.test(conexion?.effectiveType || "");

  hero.innerHTML = "";

  if (!tieneAudio) {
    hero.appendChild(video);
    if (arranqueDiferido) {
      video.preload = "none";
      return video;
    }
    video.play().catch(() => {});
    return video;
  }

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "proyecto__sonido";

  hero.append(video, boton);
  // A partir de acá el estado del sonido y el dibujo del botón son
  // asunto del gestor.
  gestorAudio.registrar(video, boton, {
    activar: textos.activarSonido,
    silenciar: textos.silenciarSonido,
  });

  boton.addEventListener("click", (evento) => {
    evento.preventDefault();
    evento.stopPropagation();
    gestorAudio.alternar(video);
  });

  // Un click en cualquier parte del video hace lo mismo. Va en el <video>
  // y no en el contenedor a propósito: el contenedor sobrevive a los
  // re-renders y se le irían acumulando listeners; el video se reemplaza
  // entero, así que su listener se va con él.
  video.addEventListener("click", () => gestorAudio.alternar(video));

  if (arranqueDiferido) {
    video.preload = "none";
    return video;
  }

  video.play().catch(() => {});

  // Si el video se va de pantalla, se corta el sonido y se pausa. Muteo Y
  // pauso: mutear es lo que resuelve el problema de audio, y pausar además
  // ahorra batería y deja el video igual que los de la sección de abajo.
  // Al volver a entrar en pantalla se reanuda la imagen pero NO el sonido:
  // reactivarlo solo sería justo lo que no queremos, y además dejaría el
  // ícono rojo diciendo una cosa distinta de la que pasa.
  if (typeof IntersectionObserver !== "undefined") {
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            video.play().catch(() => {});
          } else {
            gestorAudio.silenciar(video);
            video.pause();
          }
        });
      },
      { rootMargin: "0px" }
    );
    observador.observe(video);
  }

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
// "832 / 1200" -> true (es más alta que ancha). Sirve tanto para la
// proporción propia de una pieza como para la que impone su fila.
function esProporcionVertical(proporcion) {
  const [ancho, alto] = String(proporcion).split("/").map((n) => parseFloat(n));
  return Boolean(ancho && alto) && ancho < alto;
}

function renderMedia(contenedor, filas, textos) {
  // Desmontar de verdad lo que había: un <video> que se saca del DOM con
  // innerHTML sigue reproduciéndose (y sonando, si tuviera audio). Y el
  // IntersectionObserver del render anterior seguiría observando elementos
  // que ya no existen. Las dos cosas se limpian acá.
  contenedor.querySelectorAll("video").forEach((v) => {
    gestorAudio.olvidar(v);
    v.pause();
  });
  contenedor._observadorMedia?.disconnect();
  contenedor._observadorMedia = null;
  contenedor.innerHTML = "";
  const hayMedia = Array.isArray(filas) && filas.length > 0;
  contenedor.hidden = !hayMedia;
  if (!hayMedia) return;

  const videos = [];

  filas.forEach((filaCruda) => {
    // Una fila del JSON puede venir de dos formas:
    //   · un array de piezas (lo de siempre): cada una conserva su propia
    //     proporción, así que pueden quedar de altos distintos;
    //   · un objeto { proporcion, ajuste, piezas }: todas las piezas de esa
    //     fila usan la MISMA proporción y quedan exactamente del mismo
    //     tamaño, alineadas arriba y abajo. Es lo que hace falta cuando la
    //     fila tiene que leerse pareja.
    const filaPareja = !Array.isArray(filaCruda);
    const piezas = filaPareja ? filaCruda.piezas : filaCruda;
    const proporcionFila = filaPareja ? filaCruda.proporcion : null;
    const ajusteFila = filaPareja ? filaCruda.ajuste : null;

    const divFila = document.createElement("div");
    divFila.className = "proyecto__media-fila";
    divFila.style.setProperty("--columnas", String(piezas.length));

    piezas.forEach((pieza) => {
      const marco = document.createElement("figure");
      marco.className = "proyecto__media-pieza";
      const proporcion = proporcionFila || `${pieza.ancho} / ${pieza.alto}`;
      // Las piezas verticales (video de celular, afiche parado) llevan un
      // tope de ancho: a media columna quedarían altísimas y se comerían
      // la página. Ver la clase en layout.css.
      if (esProporcionVertical(proporcion)) {
        marco.classList.add("proyecto__media-pieza--vertical");
      }
      // La proporción reserva el espacio antes de que cargue el archivo.
      marco.style.setProperty("--proporcion", proporcion);
      // Con "contain" la pieza entra entera y lo que sobra se rellena con
      // el negro del sitio en vez del gris de placeholder.
      if (ajusteFila === "contain") {
        marco.classList.add("proyecto__media-pieza--completa");
      }

      let elemento;
      if (pieza.tipo === "video") {
        elemento = crearVideoMedia(pieza, textos);
        videos.push(elemento);
      } else {
        elemento = document.createElement("img");
        elemento.className = "proyecto__media-imagen";
        elemento.loading = "lazy";
        elemento.decoding = "async";
        elemento.width = pieza.ancho;
        elemento.height = pieza.alto;
        elemento.src = resolverRuta(pieza.src);
        elemento.alt = pieza.alt;
      }
      if (ajusteFila) elemento.style.objectFit = ajusteFila;
      // Cuando la fila recorta (cover), "encuadre" decide qué parte de esa
      // pieza en particular se conserva. Ver la nota del JSON.
      if (pieza.encuadre) elemento.style.objectPosition = pieza.encuadre;
      marco.appendChild(elemento);

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
  contenedor._observadorMedia = observador;
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

// Cuánto ocupa cada foto de la galería en pantalla. El navegador lo usa
// para decidir de qué ancho se baja el archivo, así que tiene que seguir a
// las columnas del CSS: tres desde 900px, dos desde 640px, una abajo.
// Sin esto, un celular se bajaría la versión de escritorio al pedo.
const SIZES_GALERIA = "(min-width: 900px) 31vw, (min-width: 640px) 46vw, 92vw";

// Una foto de la galería. Si el JSON trae "variantes", se arma un <picture>
// con AVIF primero (pesa bastante menos) y el JPEG de respaldo para los
// navegadores que no lo soporten, y cada formato con su srcset para que
// cada pantalla se baje el ancho que le sirve y no más.
// Si no trae variantes queda un <img> pelado, exactamente como antes: los
// proyectos que todavía no las tienen no cambian en nada.
function crearFotoGaleria(item, sizes) {
  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.src = resolverRuta(item.src);
  img.alt = item.alt;
  // Medidas reales del archivo: reservan el lugar antes de que cargue.
  if (item.ancho) img.width = item.ancho;
  if (item.alto) img.height = item.alto;

  const variantes = Array.isArray(item.variantes) ? item.variantes : [];
  if (variantes.length === 0) return img;

  const medidas = sizes || SIZES_GALERIA;
  const armarSrcset = (formato) =>
    variantes
      .filter((v) => v[formato] && v.ancho)
      .map((v) => `${resolverRuta(v[formato])} ${v.ancho}w`)
      .join(", ");

  const enJpg = armarSrcset("jpg");
  if (enJpg) {
    img.srcset = enJpg;
    img.sizes = medidas;
  }

  const enAvif = armarSrcset("avif");
  if (!enAvif) return img;

  const picture = document.createElement("picture");
  const fuente = document.createElement("source");
  fuente.type = "image/avif";
  fuente.srcset = enAvif;
  fuente.sizes = medidas;
  picture.append(fuente, img);
  return picture;
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
      // Cambio de idioma: el video no se remonta (perdería el punto de
      // reproducción), solo se le pasan los textos nuevos. El botón lo
      // repinta el gestor a partir del estado real del audio, así que no
      // hay forma de que el ícono y el sonido queden desfasados.
      const video = wrapperImagen.querySelector("video");
      video?.setAttribute("aria-label", datos.videoPortada.alt);
      if (video) {
        gestorAudio.actualizarTextos(video, {
          activar: datos.videoPortada.activarSonido,
          silenciar: datos.videoPortada.silenciarSonido,
        });
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
      // Ajuste de la foto dentro del recuadro. Por defecto "cover": llena
      // el bloque y recorta lo que sobra. Un proyecto puede pedir
      // "contain" en el JSON ("ajustePrincipal") para que la foto entre
      // ENTERA, sin que se le corte nada, y lo que sobre del recuadro se
      // rellene con el negro del sitio. Es el mismo mecanismo que usa el
      // video de portada de Quomos.
      const entraCompleta = datos.ajustePrincipal === "contain";
      imagenPrincipal.style.objectFit = datos.ajustePrincipal || "";
      imagenPrincipal.classList.toggle(
        "proyecto__imagen-principal--completa",
        entraCompleta
      );
      // Encuadre: solo tiene sentido cuando la foto se recorta. Con
      // "contain" no se recorta nada, así que no se aplica ninguno.
      imagenPrincipal.style.objectPosition = entraCompleta
        ? ""
        : datos.encuadrePrincipal || "";

      // Cuando la foto entra completa, el recuadro toma SU MISMA proporción
      // en vez de quedarse apaisado. Si no, a una foto 4:3 dentro de un
      // recuadro mucho más ancho le sobrarían franjas negras enormes a los
      // costados (y en mobile, arriba y abajo). Con esto el recuadro mide
      // lo mismo que la foto: entra entera, sin deformarse y sin que sobre
      // nada. La altura la sigue topeando la primera pantalla.
      const recuadro = imagenPrincipal.closest("[data-proyecto-imagen-wrapper]");
      if (recuadro) {
        recuadro.classList.toggle("proyecto__hero--ajustado", entraCompleta);
        if (entraCompleta && datos.anchoPrincipal && datos.altoPrincipal) {
          recuadro.style.setProperty(
            "--proporcion-portada",
            `${datos.anchoPrincipal} / ${datos.altoPrincipal}`
          );
          // El mismo dato como número suelto: calc() no puede multiplicar
          // por una proporción escrita con barra, necesita un factor.
          recuadro.style.setProperty(
            "--factor-portada",
            String(datos.anchoPrincipal / datos.altoPrincipal)
          );
        } else {
          recuadro.style.removeProperty("--proporcion-portada");
          recuadro.style.removeProperty("--factor-portada");
        }
      }
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
      const foto = crearFotoGaleria(item, datos.galeriaSizes);
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
        enlace.appendChild(foto);
        galeria.appendChild(enlace);
      } else {
        galeria.appendChild(foto);
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

    // El contenido se vuelve a armar cuando termina el fundido. Pero ese
    // evento puede no llegar nunca: si la pestaña está en segundo plano, si
    // la transición se interrumpe, o si el navegador la resuelve en cero.
    // Y si no llega, la página se queda en blanco (opacidad 0) y encima en
    // el idioma viejo. Así que hay dos disparadores, el evento y un reloj,
    // y el que llega primero hace el trabajo una única vez.
    let yaSeAplico = false;
    let reloj = 0;

    function aplicarIdioma() {
      if (yaSeAplico) return;
      yaSeAplico = true;
      clearTimeout(reloj);
      main.removeEventListener("transitionend", alTerminarFundido);
      render(nuevoIdioma);
      idiomaActual = nuevoIdioma;
      requestAnimationFrame(() => main.classList.remove("js-idioma-cambiando"));
    }

    // transitionend burbujea: hay que asegurarse de que sea el fundido del
    // propio <main> y no el de cualquier cosa que tenga adentro.
    function alTerminarFundido(evento) {
      if (evento.target !== main || evento.propertyName !== "opacity") return;
      aplicarIdioma();
    }

    main.addEventListener("transitionend", alTerminarFundido);
    reloj = setTimeout(aplicarIdioma, 400);
  });

  inicializarContacto();
  inicializarTransiciones();
}

iniciar();
