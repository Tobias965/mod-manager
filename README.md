# ModManager

![Next.js](https://img.shields.io/badge/Next.js-16.3.1-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.8-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.9.1-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-supported-4169E1?logo=postgresql&logoColor=white)

## 🎮 Descripción General del Proyecto

ModManager es una plataforma web para jugadores que utilizan mods y necesitan crear modpacks de forma segura y organizada.

El proyecto resuelve uno de los problemas más tediosos de la personalización de videojuegos: comprobar manualmente si los mods seleccionados son compatibles entre sí, si pertenecen al mismo juego y versión, si tienen dependencias pendientes o si existen incompatibilidades conocidas.

La aplicación permite gestionar juegos, versiones, mods y modpacks desde una única interfaz. Además, integra proveedores de inteligencia artificial para analizar una selección de mods y generar un informe con posibles conflictos, dependencias faltantes, advertencias y recomendaciones.

ModManager está diseñado con una arquitectura full-stack basada en Next.js, con autenticación mediante JWT, persistencia PostgreSQL y almacenamiento de archivos mediante Supabase Storage.

## ✨ Funcionalidades Principales

### 👤 Usuarios y autenticación

- Registro e inicio de sesión mediante email y contraseña.
- Contraseñas protegidas con `bcryptjs`.
- Sesiones firmadas mediante JWT usando `jose`.
- Cookie HTTP-only de sesión llamada `session`.
- Consulta de sesión activa mediante `/api/auth/me`.
- Cierre de sesión y eliminación de la cookie de autenticación.
- Actualización protegida de email y contraseña.

### 🔐 Roles y permisos

El sistema contempla tres roles:

- `USER`: puede explorar contenido y gestionar sus propios flujos permitidos.
- `CREATOR`: puede publicar y administrar mods y modpacks.
- `ADMIN`: puede moderar contenido, gestionar juegos y administrar solicitudes.

Las rutas administrativas y de gestión de mods están protegidas mediante middleware y comprobaciones adicionales en los endpoints.

### 🧩 Gestión de juegos y versiones

- Creación y administración de juegos desde el panel de administración.
- Gestión de versiones compatibles por juego.
- Asociación de mods y modpacks con un juego y una versión concreta.
- Borrado lógico de juegos mediante `deletedAt`.

### 📦 Gestión de mods

- Creación y publicación de mods.
- Estados de moderación: `PENDING`, `APPROVED` y `REJECTED`.
- Asociación de mods con categorías.
- Asociación de dependencias entre mods.
- Registro de incompatibilidades entre mods.
- Edición y gestión de mods por parte de sus autores.
- Búsqueda de mods por juego, versión y nombre.
- Borrado lógico mediante `deletedAt`.
- Validación de extensión, MIME, tamaño y hash de archivos.

### 📁 Archivos y enlaces externos

- Subida de archivos de mods a Supabase Storage.
- Soporte server-side para archivos `.zip`, `.rar` y `.7z`.
- Almacenamiento de metadatos del archivo: nombre, tamaño, MIME, hash y clave de almacenamiento.
- Uso de URLs firmadas para descargar archivos aprobados.
- Publicación mediante enlace externo para mods alojados en otras plataformas.

### 🛠️ Creación de modpacks

- Creación de modpacks asociados a un juego y versión.
- Selección de mods aprobados compatibles.
- Configuración de modpacks públicos o privados.
- Consulta de modpacks propios.
- Exploración de modpacks públicos de la comunidad.
- Validación server-side de juego, versión y mods antes de persistir el modpack.

### 🤖 Análisis y recomendaciones con IA

- Análisis de compatibilidad de una selección de mods mediante `/api/modpacks/analyze`.
- Detección previa de dependencias faltantes e incompatibilidades registradas en la base de datos.
- Generación de resumen, advertencias y recomendaciones.
- Recomendación de mods por categoría mediante `/api/modpacks/suggestions`.
- Fallback entre proveedores configurados: Gemini, Groq y OpenAI.
- Validación de las respuestas de IA antes de mostrarlas al usuario.

### 🛡️ Moderación y seguridad

- Panel administrativo para moderar mods.
- Solicitudes para obtener el rol `CREATOR`.
- Control de acceso por sesión y rol.
- Validación server-side de todas las operaciones sensibles.
- Filtros de borrado lógico en las consultas públicas principales.
- No se exponen claves secretas de Supabase ni proveedores de IA al cliente.

## 🧱 Stack Tecnológico

| Capa | Tecnologías | Responsabilidad |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, TypeScript | Páginas, formularios, navegación y componentes interactivos |
| UI y estilos | Tailwind CSS 4, PostCSS | Estilos responsive y composición visual |
| Backend | Next.js App Router, Route Handlers | API REST, autenticación y lógica server-side |
| Autenticación | `jose`, `bcryptjs` | JWT, hashing y sesiones HTTP-only |
| Base de datos | PostgreSQL | Usuarios, juegos, versiones, mods, relaciones y modpacks |
| ORM | Prisma 7, `@prisma/adapter-pg` | Schema, migraciones y acceso tipado a PostgreSQL |
| Almacenamiento | Supabase Storage | Archivos de mods y URLs firmadas de descarga |
| Inteligencia artificial | Google Gemini, Groq y OpenAI | Análisis y recomendaciones de modpacks |
| Calidad | ESLint, TypeScript | Linting, validación estática y comprobación de tipos |
| Runtime | Node.js | Ejecución de desarrollo y producción |

## 🗂️ Estructura del Proyecto

```text
mod-manager/
├── app/
│   ├── api/                         # Route Handlers de la API
│   │   ├── admin/games/             # Gestión administrativa de juegos y versiones
│   │   ├── auth/                    # Registro, login, logout y sesión actual
│   │   ├── creator-requests/        # Solicitudes para obtener rol de creador
│   │   ├── games/                   # Consultas públicas de juegos
│   │   ├── modpacks/                # Creación, análisis y sugerencias de modpacks
│   │   ├── mods/                    # CRUD, búsqueda, descarga y relaciones de mods
│   │   └── users/                   # Perfiles y actualización protegida de usuarios
│   ├── admin/                       # Páginas del panel de administración
│   ├── games/                       # Páginas de juegos y versiones
│   ├── login/                       # Página de inicio de sesión
│   ├── modpacks/                    # Exploración, creación y gestión de modpacks
│   ├── mods/                        # Gestión, edición y publicación de mods
│   ├── register/                    # Página de registro
│   ├── users/                       # Perfiles públicos de usuarios
│   ├── globals.css                  # Estilos globales
│   ├── layout.tsx                   # Layout raíz de la aplicación
│   └── page.tsx                     # Página principal
├── components/
│   ├── mods/                        # Formulario de alta de mods modularizado
│   │   ├── BasicInfoFields.tsx      # Datos básicos, juego, versión y licencia
│   │   ├── CategorySelector.tsx     # Selector de categorías
│   │   ├── ModPicker.tsx            # Selector de dependencias e incompatibilidades
│   │   ├── ModSourceSelector.tsx    # Subida de archivo o enlace externo
│   │   ├── NewModForm.tsx           # Composición principal del formulario
│   │   └── useNewModForm.ts         # Estado, validación y envío del formulario
│   ├── GameSelect.tsx               # Selector reutilizable de juegos
│   ├── ModpackAI.tsx                # Interfaz de análisis y sugerencias con IA
│   ├── Navbar.tsx                   # Navegación principal
│   └── VersionSelect.tsx            # Selector reutilizable de versiones
├── lib/
│   ├── ai/                          # Integraciones y fallback de proveedores IA
│   ├── auth.ts                      # JWT, sesiones, roles y contraseñas
│   ├── modpacks.ts                  # Servicio compartido de creación de modpacks
│   ├── prisma.ts                    # Cliente Prisma singleton
│   ├── security.ts                  # Validaciones de archivos, URLs y hashes
│   └── supabase.ts                  # Cliente administrativo de Supabase Storage
├── prisma/
│   ├── migrations/                  # Historial de migraciones PostgreSQL
│   └── schema.prisma                # Modelos, relaciones y enums de la aplicación
├── public/                          # Recursos públicos estáticos
├── types/
│   └── mod.ts                       # Tipos compartidos de juegos, mods y categorías
├── middleware.ts                    # Protección de rutas y redirecciones por rol
├── prisma.config.ts                 # Configuración de Prisma CLI y migraciones
├── next.config.ts                   # Configuración de Next.js
├── eslint.config.mjs                # Configuración de ESLint
├── package.json                     # Dependencias y scripts
└── tsconfig.json                    # Configuración de TypeScript y alias @/*
```

## 🚀 Instalación y Ejecución

### Requisitos previos

- Node.js 20 o superior recomendado.
- npm 10 o superior recomendado.
- PostgreSQL 14 o superior, local o administrado.
- Una cuenta de Supabase con un bucket para archivos de mods.
- Al menos un proveedor de IA configurado para usar análisis y sugerencias:
  - Google Gemini.
  - Groq.
  - OpenAI.
- Git.

### 1. Clonar el repositorio

Sustituye la URL por la URL real del repositorio de GitHub:

```bash
git clone https://github.com/<usuario>/mod-manager.git
cd mod-manager
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto. No lo publiques en GitHub.

Ejemplo de `.env.example`:

```env
# PostgreSQL usado por la aplicación en runtime
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/mod_manager"

# URL de conexión usada por Prisma CLI y migraciones
DIRECT_URL="postgresql://usuario:contraseña@localhost:5432/mod_manager"

# Clave secreta para firmar JWT. Usa un valor largo y aleatorio.
JWT_SECRET="cambia-esta-clave-por-un-secreto-seguro"

# Supabase Storage. Esta clave es privada y solo debe usarse en el servidor.
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"

# Proveedor Gemini
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.0-flash"

# Proveedor Groq
GROQ_API_KEY=""
GROQ_MODEL="llama-3.3-70b-versatile"

# Proveedor OpenAI
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"

# Opcional: puerto utilizado por Next.js
PORT="3000"
```

#### Variables obligatorias

- `DATABASE_URL`: conexión PostgreSQL utilizada por `lib/prisma.ts`.
- `DIRECT_URL`: conexión utilizada por Prisma CLI según `prisma.config.ts`.
- `JWT_SECRET`: secreto necesario para iniciar la capa de autenticación.
- `SUPABASE_URL`: URL del proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privada para gestionar archivos en Storage.

#### Variables de IA

Configura al menos un proveedor para habilitar el análisis. El sistema intenta utilizar los proveedores configurados siguiendo el flujo de fallback definido en `lib/ai/suggestions.ts`.

No expongas ninguna de estas claves con variables `NEXT_PUBLIC_*`. En especial, `SUPABASE_SERVICE_ROLE_KEY` debe permanecer únicamente en el servidor.

### 4. Aplicar las migraciones de base de datos

Para desarrollo local:

```bash
npx prisma generate
npx prisma migrate dev
```

Para un entorno de producción o CI/CD:

```bash
npx prisma generate
npx prisma migrate deploy
```

Puedes comprobar que el schema sea válido con:

```bash
npx prisma validate
```

El proyecto tiene configurada una ruta de seed en `prisma.config.ts` (`tsx prisma/seed.ts`). Si se incorpora el archivo `prisma/seed.ts`, el comando para poblar datos será:

```bash
npx prisma db seed
```

Actualmente el repositorio debe incluir ese archivo antes de usar el comando de seed; las migraciones no dependen de datos iniciales.

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 6. Validar el proyecto

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
```

### 7. Construir y ejecutar en producción

```bash
npm run build
npm start
```

También puedes ejecutar ambos pasos de forma consecutiva:

```bash
npm run build && npm start
```

La aplicación estará disponible por defecto en `http://localhost:3000`. Para cambiar el puerto:

```bash
npm start -- -p 4000
```

## 🔌 Rutas principales de la API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Registrar un usuario |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/auth/me` | Consultar la sesión actual |
| `GET` | `/api/games` | Consultar juegos disponibles |
| `GET` / `POST` | `/api/mods` | Listar datos de publicación y crear mods |
| `GET` | `/api/mods/search` | Buscar mods aprobados |
| `GET` | `/api/mods/[id]/download` | Generar una descarga firmada |
| `POST` | `/api/modpacks` | Crear un modpack |
| `POST` | `/api/modpacks/analyze` | Analizar compatibilidad con IA |
| `POST` | `/api/modpacks/suggestions` | Obtener sugerencias con IA |
| `GET` / `PATCH` | `/api/users/[id]` | Consultar o actualizar un usuario autorizado |

Las rutas administrativas requieren sesión con rol `ADMIN`. Las operaciones de publicación y gestión de mods requieren `CREATOR` o `ADMIN` según la operación.

## 🗃️ Modelo de datos

Las entidades principales son:

- `User`: usuarios, credenciales y roles.
- `CreatorRequest`: solicitudes para convertirse en creador.
- `Game`: juegos disponibles.
- `GameVersion`: versiones compatibles de cada juego.
- `Mod`: mods publicados y sus metadatos de almacenamiento.
- `Category`: categorías de clasificación.
- `ModDependency`: relaciones de dependencia entre mods.
- `ModIncompatibility`: relaciones de incompatibilidad entre mods.
- `Modpack`: colecciones públicas o privadas de mods.
- `ModpackMod`: relación muchos a muchos entre modpacks y mods.

## 🔒 Consideraciones de seguridad

- Mantén `.env` y `.env.local` fuera del control de versiones.
- Usa un `JWT_SECRET` largo, aleatorio y diferente por entorno.
- Nunca envíes `SUPABASE_SERVICE_ROLE_KEY` al navegador.
- Valida permisos en los Route Handlers aunque exista protección en middleware.
- Usa HTTPS en producción.
- Configura políticas adecuadas en PostgreSQL y Supabase.
- Revisa los límites de tamaño y tipos de archivo antes de permitir publicaciones.

## 📄 Licencia

**Todos los derechos reservados (All Rights Reserved).**

Este proyecto es de código cerrado y de carácter **privado y confidencial**. Queda estrictamente prohibida la copia, reproducción, modificación, redistribución o publicación pública de este código fuente (parcial o totalmente) en cualquier medio o plataforma sin la autorización previa y por escrito del autor.
