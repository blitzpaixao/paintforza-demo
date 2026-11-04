"""Servidor local da demonstração Paint Forza.

Uso:  python servidor.py   e abra http://localhost:5500
"""
import http.server
import sys
import webbrowser

PORTA = 5500


class SemCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("", PORTA), SemCache) as httpd:
        print(f"Paint Forza rodando em http://localhost:{PORTA}  (Ctrl+C para parar)")
        if "--sem-navegador" not in sys.argv:
            webbrowser.open(f"http://localhost:{PORTA}")
        httpd.serve_forever()
