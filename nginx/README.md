# nginx

Reverse proxy config for **testing header-based auth** locally.

When Crossview runs with `server.auth.mode: header`, it trusts the user identity from a header (e.g. `X-Auth-User`) set by an upstream proxy. These configs run that proxy on port 8080 and add `X-Auth-User: testuser` so you can test the full UI without a real IdP.

**Usage with `npm start`** (single server on 3001)

1. Set Crossview to header auth (e.g. use `config/examples/config-header.yaml.example`).
2. Start the app: from repo root, `npm start` (builds frontend and runs Go server on 3001).
3. Start nginx:
   ```bash
   nginx -p "$(pwd)" -c "$(pwd)/nginx/crossview-header-auth-single.conf"
   ```
4. Open **http://localhost:8080**; you will be signed in as `testuser`.

**Usage with `npm run dev`** (frontend on 5173, backend on 3001)

1. Set Crossview to header auth.
2. Start backend: `cd crossview-go-server && go run main.go serve`. Start frontend: `npm run dev`.
3. Start nginx:
   ```bash
   nginx -p "$(pwd)" -c "$(pwd)/nginx/crossview-header-auth.conf"
   ```
4. Open **http://localhost:8080**.

To stop nginx: `nginx -s stop` (or Ctrl+C if run in the foreground).

**502 Bad Gateway?** The upstream is not running. For `npm start` use `crossview-header-auth-single.conf` and ensure the Go server is up on 3001. For the two-server setup use `crossview-header-auth.conf` and ensure both 3001 and 5173 are running.
