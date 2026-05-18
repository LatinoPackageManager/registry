# Latipm Registry

Backend principal para LPM. Guarda metadata en MongoDB y tarballs en R2/S3. (Nota: Por mientras no se usa Tarball directamentes, si no que se comprime el paquete en un archivo zip y se sube a R2, en un futuro se podria usar Tarball directamente).

## Produccion

Variables requeridas con `NODE_ENV=production`:

```bash
NODE_ENV=production
PORT=8787
CORS_ORIGIN=https://tu-frontend.com
JWT_SECRET=un-secreto-largo
JWT_EXPIRES_IN_SECONDS=2592000
MONGO_URI=mongodb+srv://...
MONGO_DB_NAME=latipm_registry
MONGO_SERVER_SELECTION_TIMEOUT_MS=10000
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn.tu-dominio.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=300
MAX_PACKAGE_BYTES=26214400
```

## Scripts

```bash
bun install
bun run typecheck
bun run start
```

## Endpoints clave

- `GET /health`
- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `PATCH /v1/users/me`
- `GET /v1/search?q=math`
- `GET /v1/packages/:name`
- `GET /v1/packages/:name/:version`
- `GET /v1/packages/:name/dependents`
- `GET /v1/packages/:name/stats?days=30`
- `POST /v1/packages/:name/:version`
- `GET /v1/download/:name/:version`
- `GET /v1/users/me/packages`
- `GET /v1/users/:id`

## Perfil publico de usuarios

Los usuarios pueden tener metadata publica para el frontend:

```json
{
  "username": "latino-dev",
  "displayName": "Latino Dev",
  "avatarUrl": "https://example.com/avatar.png",
  "bio": "Mantengo paquetes para Latino",
  "website": "https://example.com",
  "github": "usuario-github"
}
```

`GET /v1/packages/:name` devuelve `owner` con este perfil publico, listo para mostrarlo en una pagina tipo npm.