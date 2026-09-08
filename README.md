# PentaPeña

Una aplicación social, móvil y sin balances para recordar quién paga la próxima Peña.

## Desarrollo

```bash
npm install
npm run dev
npm test
npm run build
```

La versión actual persiste en `localStorage` mediante `StorageAdapter` (`src/storage.ts`): cada teléfono guarda su propio estado. Para que los cuatro participantes vean y modifiquen el mismo turno, pases e historial desde el enlace de Telegram, hay que sustituirlo por un backend compartido (por ejemplo Supabase/Postgres). Para eso:

1. Cree un proyecto gratuito en [supabase.com](https://supabase.com) y cree una tabla `app_state` con columnas `id` (texto, PK), `revision` (entero) y `data` (jsonb).
2. Implemente un `SupabaseStorageAdapter` que cumpla el mismo contrato `StorageAdapter` (`load()`/`save()`), agregando un chequeo de `revision` para evitar que dos personas se sobrescriban en silencio (si la revisión no coincide, recargue el estado más reciente y pida reintentar).
3. Guarde `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como *secrets* del repositorio y páselos como variables de entorno al paso `npm run build` del workflow de despliegue.
4. Toda la lógica de rotación y pases vive en `src/rotation.ts` y `src/appLogic.ts`, y la interfaz en `src/App.tsx` — no debería ser necesario tocarlas para este cambio.

## GitHub Pages (URL compartible para Telegram)

El workflow `.github/workflows/deploy.yml` ya prueba, compila y publica `dist` en cada push a `main`. **Falta un paso manual único**: en **Settings → Pages** de este repositorio, seleccione **GitHub Actions** como *Source* (el último intento de despliegue falló exactamente en ese punto porque Pages aún no está habilitado). Una vez habilitado:

- Vuelva a ejecutar el workflow (o haga un nuevo push a `main`).
- La aplicación quedará disponible en `https://fidelmorla.github.io/pentapena/`, lista para compartir en el grupo de Telegram.
- Mientras el estado sea solo `localStorage`, cada persona que abra el enlace verá su propio turno local; para un turno realmente compartido, complete la integración de backend descrita arriba.
