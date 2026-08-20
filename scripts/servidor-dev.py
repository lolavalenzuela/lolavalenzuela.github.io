#!/usr/bin/env python3
"""Servidor local para desarrollo: igual que `python3 -m http.server`,
pero le agrega "Cache-Control: no-store" a cada respuesta para que el
navegador nunca sirva una versión vieja de un archivo mientras estás
editando el sitio. Solo para uso local — no lo necesitás para publicar
el sitio (Netlify/Vercel/GitHub Pages manejan el caching solos).

Uso:
    python3 scripts/servidor-dev.py [puerto]

Por defecto usa el puerto 8000.
"""

import http.server
import sys


class HandlerSinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    servidor = http.server.HTTPServer(("", puerto), HandlerSinCache)
    print(f"Sirviendo en http://localhost:{puerto} (sin caché)")
    servidor.serve_forever()
