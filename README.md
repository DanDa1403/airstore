# AirStore

Tienda de AirPods Pro con carrito, checkout por WhatsApp, control de inventario y panel de admin.

## Inventario / Admin

Se despliega en Netlify (funciones serverless vía `@astrojs/netlify`) con base de datos en **Turso** (SQLite hosteado, vía `@libsql/client`).

- Panel de admin (protegido con login): **`/panel-air29k`** — no está enlazado desde ningún lado del sitio público y sus páginas llevan `noindex`. El vendedor debe guardarlo en favoritos; el acceso real lo protege la contraseña, no que la ruta sea "secreta".
- Variables de entorno obligatorias, configúralas en **Netlify → Site settings → Environment variables** (nunca las subas al repo):
  - `ADMIN_PASSWORD` — contraseña del panel.
  - `TURSO_DATABASE_URL` — URL de tu base de datos Turso (`libsql://tu-db-xxxx.turso.io`).
  - `TURSO_AUTH_TOKEN` — token de autenticación de esa base de datos.
- En desarrollo local, `.env` ya usa `TURSO_DATABASE_URL=file:./data/airstore.db` (un archivo SQLite local, sin necesitar cuenta de Turso). En producción, reemplázalo por las credenciales reales de Turso.
- Las tablas (`products`, `orders`, `sessions`) se crean solas la primera vez que corre una función; los productos se siembran solo si la tabla está vacía.

## Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
