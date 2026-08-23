# Inventario Gimnasio — App offline-first

App de conteo de inventario para recepción. Funciona 100% sin internet;
solo necesita conexión para instalarse, actualizarse y sincronizar/respaldar datos.

## Qué incluye este MVP

- Modelo de datos completo (`src/types/index.ts`)
- Base de datos local con IndexedDB / Dexie (`src/lib/db.ts`) — funciona sin internet
- Cola de sincronización offline-first (`src/lib/sync.ts`)
- Login rápido por PIN (`/`)
- Pantalla de conteo con cálculo automático instantáneo (`/count`)
- Resumen final de conteo (`/count/resumen/[id]`)
- Panel admin: gestión básica de productos (`/admin/productos`)
- PWA instalable (manifest + service worker vía `next-pwa`)
- Datos de ejemplo (Agua 600ml, Barra de chocolate, Agua saborizada)

## Qué falta para producción (siguiente iteración)

- CRUD completo de categorías, ubicaciones, usuarios y sucursales en el panel admin
- Historial de conteos con filtros
- Comparación de inventarios (diferencias entre fechas)
- Exportación a Excel/CSV/PDF
- Dashboard administrativo con alertas
- Reglas de seguridad de Firestore por rol
- Modo "Conteo rápido" (lista continua sin scroll por tarjetas)
- Manejo visual de conflictos de sincronización

Puedes pedirme cualquiera de estos módulos cuando quieras y seguimos con el mismo patrón de código.

---

## 1. Instalación en tu computadora (VS Code)

```bash
# 1. Descomprime este proyecto y ábrelo en VS Code
cd gym-inventory
npm install
npm run dev
```

Abre `http://localhost:3000`. Ya puedes probar todo el flujo sin internet
(cierra el wifi y comprueba que sigue funcionando después de la primera carga).

Usuarios de prueba:
- Admin → PIN `0000`
- María (recepcionista) → PIN `1234`

## 2. Conectar Firebase (para respaldo y sincronización)

1. Ve a https://console.firebase.google.com y crea un proyecto (o usa uno existente).
2. Activa **Firestore Database** (modo producción) y **Authentication**.
3. En "Configuración del proyecto → Tus apps", crea una app web y copia las credenciales.
4. Crea un archivo `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

5. Configura reglas de Firestore para que cada rol solo acceda a lo que le corresponde
   (te puedo ayudar a escribirlas cuando lleguemos a esa parte).

## 3. Subir a GitHub

```bash
git init
git add .
git commit -m "MVP inventario offline-first"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gym-inventory.git
git push -u origin main
```

## 4. Desplegar en Vercel

1. Entra a https://vercel.com, "Add New Project" → importa el repo de GitHub.
2. En "Environment Variables" pega las mismas variables del `.env.local`.
3. Deploy. Vercel te da una URL `https://tu-app.vercel.app`.

## 5. Instalar la app en Android (como PWA)

1. Abre la URL de Vercel en Chrome (Android).
2. Menú (⋮) → "Instalar aplicación" o "Agregar a pantalla de inicio".
3. Queda instalada como app nativa, con ícono propio, y funcionará sin internet
   después de la primera apertura (el service worker cachea todo).

## 6. Instalar en computadora (opcional)

En Chrome/Edge de escritorio, abre la URL y haz clic en el ícono de instalar
que aparece en la barra de direcciones.

---

## Cómo seguimos

Dime cuál módulo quieres que construya a continuación (recomiendo en este orden):
1. Historial + filtros
2. CRUD completo de ubicaciones/categorías/usuarios en el admin
3. Comparación de inventarios y alertas
4. Exportación (Excel/CSV/PDF)
5. Reglas de seguridad de Firestore

Y seguimos ampliando el mismo proyecto.
