# Peña Impacto

App web para organizar los almuerzos, comidas y cenas del txoko.

- **Resumen**: los eventos de hoy y de los próximos 14 días. Cada socio se apunta con sus comensales.
- **Nuevo evento**: almuerzo, comida o cena, con día, hora y notas. Quien lo crea queda como organizador.
- **Configuración**: cambiar tu nombre y cerrar sesión.
- **Compras** y **Estatutos**: pendientes.

Sin los datos de Supabase en `src/config.js`, la app funciona en **modo demo** con datos de ejemplo.

## Puesta en marcha (una sola vez)

1. En [supabase.com](https://supabase.com) crea un proyecto nuevo llamado **Peña Impacto**.
2. Abre **SQL Editor → New query**, pega el contenido de `supabase/setup.sql` y pulsa **Run**.
3. En **Project Settings → API** copia la **Project URL** y la clave **publishable**, y ponlas en `src/config.js`.
4. En **Authentication → Sign In / Providers → Email**, desactiva **Allow new users to sign up** (solo entran socios invitados).
5. Publica la app (`npm run deploy`) y, en **Authentication → URL Configuration**, pon la dirección publicada en **Site URL**.
6. Para hacerte administrador: en **Table Editor → socios**, marca `es_admin` en tu fila.

## Invitar a un socio

**Authentication → Users → Invite user** con su email. Le llega un correo; al abrir el enlace elige su contraseña y ya está dentro.
Su nombre será la parte de su email antes de la @; lo puede cambiar en Configuración.

## Usarla en el ordenador

```bash
npm run dev
```

Abre la dirección que aparece (por ejemplo http://localhost:5173).

## Publicar cambios

```bash
npm run deploy
```

## Piezas

- React + Vite
- Supabase: cuentas y tablas `socios`, `eventos` y `apuntados`
- Vercel: publicación
