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

## El movimiento del sitio

Todo el movimiento se calibra en `css/animaciones.css`, dentro de `:root`, al
principio del archivo. No hay números sueltos repartidos por el código.

### La perilla general

**`--movimiento`** multiplica todas las distancias y duraciones de las
animaciones de entrada:

- `1` → como está entregado
- `0.5` → la mitad, más sobrio
- `0` → sin movimiento: todo aparece directo, sin desplazarse

**Para apagar TODO de una**, sin tocar variables: agregale la clase
`sin-movimiento` al `<body>` del HTML que quieras probar:

```html
<body data-pagina="home" class="sin-movimiento">
```

Y si en el sistema operativo está activado "reducir movimiento", el sitio se
apaga solo: no hay que hacer nada.

### Qué se mueve, y con qué se calibra cada cosa

| Qué | Dónde se ve | Variable |
|---|---|---|
| **Entrada al aparecer en pantalla.** Cada bloque entra con un fundido y un desplazamiento corto hacia arriba, una sola vez. | Toda la grilla de la home, y en los proyectos la ficha, la descripción, cada fila de media y el pie | `--reveal-distancia` (cuánto sube: 8px apenas, 24px notorio) y `--reveal-dur` (cuánto tarda) |
| **Escalonado.** Los elementos de una misma sección entran uno atrás del otro. | Grilla de la home, filas de media | `--paso-stagger` (más ms = más separados) |
| **Título del proyecto.** Sube desde abajo detrás de un recorte. | El título grande rojo de cada proyecto | `--reveal-titulo-dur` |
| **Parallax.** Las fotos se desplazan unos píxeles menos que el scroll, para dar profundidad. | Páginas de proyecto, solo con mouse | `--parallax-fuerza` (0 lo apaga; 0.06 sutil; arriba de 0.12 se nota demasiado) |
| **Franja de texto en loop.** Una banda fina con una frase que se repite, al pie de la home. | Home, abajo de la grilla | `--marquee-velocidad` (MÁS segundos = MÁS lenta). El texto se edita en `data/contenido.json`, en `home.franja` |
| **Imán de los botones.** El botón se corre unos píxeles hacia el puntero. | "contacto" y el botón de la web de Quomos | `--iman-fuerza` (0 lo apaga; 0.3 ya es mucho) |
| **Intro de la home.** Logo, navegación y grilla entran encadenados. | Solo la primera vez que entrás a la home en cada visita | `--paso-stagger` |

### Lo que ya existía y sigue igual

- `--dur-rapida`, `--dur-media`, `--dur-lenta` → velocidad del hover, la
  transición entre páginas y el cambio de idioma.
- `--escala-hover-bloque` / `--escala-hover-imagen` → cuánto "crece" un
  bloque de la grilla al pasar el mouse. Más cerca de `1` = más sutil.
- `--desplazamiento-hover` → cuántos píxeles se desplaza el bloque en hover.
- `--hover-atenuacion` → cuánto se apagan las otras portadas.

### Detalles que conviene saber

- **En celulares y tablets no hay parallax ni imán**: el scroll con el dedo
  es mucho más sensible y el movimiento se siente inestable. Las entradas
  por scroll sí funcionan igual.
- **Hay dos redes de seguridad** para que nunca quede contenido invisible: un
  script en el `<head>` que muestra todo a los 3 segundos si el JavaScript no
  llegara a cargar, y otra dentro de `js/movimiento.js` que a los 2,5
  segundos revela lo que esté a la vista por si el navegador no avisara.
- **Las fotos que entran completas no llevan parallax** (las dos portadas de
  Fuera de Servicio, el teaser de Quomos y sus dos videos verticales):
  moverlas las despegaría de su caja.
- El código del movimiento está en `js/movimiento.js`, comentado paso a paso.

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
