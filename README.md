# Portfolio — Lola Valenzuela

Sitio estático (HTML + CSS + JS vanilla, sin frameworks ni build step).

## Cómo abrirlo en local

Los módulos JS (`type="module"`) usan `fetch()` para cargar `data/contenido.json`,
y los navegadores bloquean ese `fetch` si abrís el HTML directo con doble click
(protocolo `file://`). Hace falta un servidor local simple — no necesitás
instalar nada especial:

**Con Python (ya viene instalado en Mac):**
```bash
cd "/Users/loli/Desktop/PORT CLAUDE"
python3 -m http.server 8000
```
Después abrí `http://localhost:8000` en el navegador.

**Con VS Code:** instalá la extensión "Live Server" y hacé click derecho sobre
`index.html` → "Open with Live Server".

Para publicarlo (Netlify, Vercel, GitHub Pages) no hace falta nada de esto:
subís la carpeta tal cual y el hosting sirve los archivos por HTTP directamente.

## Dónde reemplazar cada imagen

Todas las imágenes son placeholders grises (`#D9D9D9`) generados como `.svg`,
con el nombre exacto que van a tener las imágenes reales. Para reemplazar una,
**pisá el archivo con el mismo nombre** (podés usar `.jpg`, `.png` o `.webp`,
pero después tenés que actualizar la extensión en `data/contenido.json` — ver
la sección siguiente).

- `assets/img/about-foto.jpg` → tu foto de la página "sobre mí" (ya está la
  que mandaste, redimensionada).
- `assets/img/proyectos/proyecto-1.svg` ... `proyecto-6.svg` → la imagen de
  portada de cada proyecto (se usa en la grilla de home Y como imagen
  principal de la página de ese proyecto).
- `assets/img/proyectos/proyecto-N-galeria-1.svg`, `-galeria-2.svg`, etc. →
  imágenes de la galería de cada proyecto. Podés agregar más (ver más abajo).
- `favicon.svg` → el ícono de la pestaña del navegador (ahora es un placeholder
  con una "L" roja).

Las proporciones de los 6 bloques de la home están fijas por diseño (en
`css/layout.css`, buscá `[data-bloque="1"]` etc.) — no dependen del tamaño
real de tu foto, así que cualquier imagen que pongas se recorta automáticamente
para llenar el marco (`object-fit: cover`). Elegí la parte más importante de
la foto pensando que los bordes pueden recortarse.

## Cómo editar textos y traducciones

**Todo el contenido editable vive en `data/contenido.json`.** No hace falta
tocar ningún HTML para cambiar un texto. El archivo tiene dos bloques
completos, `"es"` y `"en"` — cada uno con la misma estructura, así que un
cambio de texto en español no se traduce solo, hay que editar los dos.

Estructura relevante:

- `home.proyectos` → array de 6 objetos (título, alt de la imagen, ruta de
  la imagen) que arman la grilla de la home. El orden del array define qué
  bloque de la grilla ocupa cada proyecto (bloque 1 y 2 = primera columna,
  3 y 4 = segunda, 5 y 6 = tercera).
- `about` → nombre, presentación, educación (array de strings), herramientas
  (array de strings), foto.
- `contacto` → mail y redes (`redes` es un array de `{ nombre, url }` — los
  `url: "#"` son placeholders, reemplazalos por tus links reales).
- `proyectos.proyecto-1` ... `proyecto-6` → la ficha completa de cada
  proyecto: título, año, tipo, rol, herramientas, descripción, imagen
  principal, galería (array de `{ src, alt }`, podés agregar o sacar
  elementos libremente), y opcionalmente `video` (URL de embed de
  YouTube/Vimeo, ej. `"https://www.youtube.com/embed/XXXXX"`) o `audio`
  (ruta a un archivo de audio, ej. `"assets/audio/proyecto-1.mp3"`). Dejalos
  en `null` si el proyecto no tiene.

Todo lo que está entre corchetes (`[TÍTULO PROYECTO 1]`, `[AÑO]`, etc.) es
placeholder — reemplazalo por el contenido real cuando lo tengas. El sitio
funciona igual mientras tanto, solo se ve el placeholder como texto.

## Cómo cambiar colores y tipografía

Todo en `css/base.css`, dentro de `:root`:

- `--rojo`, `--negro`, `--blanco`, `--gris-texto` → paleta general.
- `--fuente` → la stack de tipografías. Si conseguís una tipografía propia,
  ponela en `assets/fonts/` y descomentá el bloque `@font-face` al final de
  `css/base.css`.
- Los tamaños de texto (`--tam-*`) usan `clamp()`, así que ya son fluidos
  entre mobile y desktop sin que tengas que tocar nada más.

## Cómo calibrar la intensidad de las animaciones

Todo centralizado en `css/animaciones.css`, dentro de `:root` (al principio
del archivo, con comentarios explicando cada variable):

- `--dur-rapida`, `--dur-media`, `--dur-lenta` → velocidad de las
  animaciones (hover, transición entre páginas, cambio de idioma).
- `--escala-hover-bloque` / `--escala-hover-imagen` → cuánto "crece" un
  bloque de la grilla al pasar el mouse. Más cerca de `1` = más sutil.
- `--desplazamiento-hover` → cuántos píxeles se desplaza el bloque hacia
  arriba en hover.
- `--paso-stagger` → el delay entre bloque y bloque en la animación de
  entrada a la home.

Si el usuario tiene activado "reducir movimiento" en su sistema operativo,
todas estas variables se redefinen automáticamente a valores casi nulos —
no hace falta hacer nada para eso, ya está resuelto.

## Estructura del sitio

```
index.html              → home (grilla de 6 proyectos)
about.html               → página "sobre mí"
proyectos/proyecto-N.html → las 6 páginas de proyecto (mismo template)
css/base.css             → reset, variables, tipografía
css/layout.css           → header, grilla, layouts de about/proyecto
css/animaciones.css      → hover, transiciones, prefers-reduced-motion
js/main.js                → arma el contenido dinámico de cada página
js/idioma.js               → toggle es/en
js/contacto.js             → panel de contacto (abrir/cerrar/foco/Escape)
js/transiciones.js         → transición del nombre y de las imágenes
js/contenido.js            → carga data/contenido.json
data/contenido.json      → TODO el contenido editable, en es/en
assets/img/               → imágenes (ver arriba)
assets/fonts/             → tipografías propias (opcional)
```

## Transición del nombre (home/proyecto → about)

En navegadores con soporte de View Transitions API (Chrome/Edge recientes)
el nombre "Lola Valenzuela" viaja y crece automáticamente del header a la
página about — no depende de JS, es CSS puro (`@view-transition` en
`animaciones.css` + `view-transition-name` en `layout.css`). En navegadores
sin soporte (Safari, Firefox al momento de escribir esto), `js/transiciones.js`
hace lo mismo a mano con la Web Animations API. En cualquier caso el sitio
nunca se rompe: en el peor escenario, la navegación es instantánea sin
animación.

## Cómo publicarlo

Subí la carpeta completa tal cual a Netlify, Vercel o GitHub Pages — no hace
falta build ni configuración, es HTML/CSS/JS estático. Solo asegurate de que
`index.html` quede en la raíz del sitio publicado.

## Pendiente / cosas que quedaron con placeholder

- Textos de los 6 proyectos (título, año, rol, descripción) — placeholders
  entre corchetes en `data/contenido.json`.
- Imágenes reales de los 6 proyectos y su galería — placeholders grises en
  `assets/img/proyectos/`.
- Links de contacto (mail real, Instagram, LinkedIn, Behance) — en
  `contacto` dentro de `data/contenido.json`.
- Favicon final (hay un placeholder simple con una "L" roja).
