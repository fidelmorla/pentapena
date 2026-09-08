# PentaPeña

Una aplicación social, móvil y sin balances para recordar quién paga la próxima Peña.

## Desarrollo

```bash
npm install
npm run dev
npm test
npm run build
```

## Estado compartido (Supabase)

Los cuatro participantes ven y modifican el mismo turno, pases e historial a través de una tabla `app_state` en Supabase (`src/storage.ts`, clase `SupabaseStorageAdapter`). Contrato:

- `load()` trae la fila `id = 'main'` (`revision`, `data`, `updated_at`); si no existe, la crea con el estado inicial.
- `save(next)` hace `update ... where id = 'main' and revision = next.revision`. Si otra persona guardó primero, la actualización no afecta ninguna fila; el adaptador entonces recarga el estado más reciente y la interfaz avisa "Alguien más actualizó el estado. Intenta de nuevo." en vez de sobrescribir en silencio.
- Migración: `supabase/migrations` (o el SQL de creación de tabla + políticas) crea `app_state` con RLS habilitado y políticas explícitas que permiten al rol `anon` leer/insertar/actualizar esa única fila — coherente con que PentaPeña es un enlace sin login para un grupo privado de 4 amigos.

**Variables de entorno** (ver `.env.example`):

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon o publishable key>
```

Si estas variables no están definidas en tiempo de build, la app cae automáticamente a `LocalStorageAdapter` (estado por teléfono, útil para desarrollo local sin backend).

Para que el despliegue en GitHub Pages tenga el backend compartido, agregue estos dos valores como **Settings → Secrets and variables → Actions → Repository secrets** con los nombres exactos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (el workflow ya los pasa a `npm run build`).

Toda la lógica de rotación y pases vive en `src/rotation.ts` y `src/appLogic.ts`, y la interfaz en `src/App.tsx` — independiente del backend elegido.

## GitHub Pages (URL compartible para Telegram)

El workflow `.github/workflows/deploy.yml` ya prueba, compila y publica `dist` en cada push a `main`. **Falta un paso manual único**: en **Settings → Pages** de este repositorio, seleccione **GitHub Actions** como *Source* (el último intento de despliegue falló exactamente en ese punto porque Pages aún no está habilitado). Una vez habilitado:

- Agregue los *secrets* `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` descritos arriba (si no están, el build compila igual pero cada teléfono queda con su propio estado local).
- Vuelva a ejecutar el workflow (o haga un nuevo push a `main`).
- La aplicación quedará disponible en `https://fidelmorla.github.io/pentapena/`, lista para compartir en el grupo de Telegram — con el mismo turno, pases e historial para los cuatro.
