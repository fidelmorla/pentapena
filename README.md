# PentaPeña

Una aplicación social, móvil y sin balances para recordar quién paga la próxima Peña.

## Desarrollo

```bash
npm install
npm run dev
npm test
npm run build
```

La versión inicial persiste en `localStorage` mediante `StorageAdapter`. Para compartir el mismo estado entre los cuatro participantes, implemente un `SupabaseStorageAdapter` con `load()` y `save()`, manteniendo intactos el motor de rotación y la interfaz.

## GitHub Pages

El workflow incluido prueba, compila y publica `dist`. En **Settings → Pages**, seleccione **GitHub Actions** como fuente. La aplicación quedará disponible en `https://fidelmorla.github.io/pentapena/`.
