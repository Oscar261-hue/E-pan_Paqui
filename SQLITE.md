# SQLite local

El proyecto usa Prisma `6.16.2`, compatible con SQLite, enums y campos JSON.

La configuración local es:

```env
DATABASE_URL="file:./dev.db"
```

Como el esquema está en `prisma/schema.prisma`, esta ruta apunta a `prisma/dev.db`. No elimina ni reemplaza automáticamente una base existente.

## Primera configuración

Desde `C:\dev\E-pan`, ejecuta manualmente en este orden:

```powershell
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

Usa `db:push` únicamente con una base nueva o respaldada. Si Prisma muestra una advertencia de reset o pérdida de datos, cancela el comando y no aceptes el reset.

Para una instalación sin datos demo, omite `npm run db:seed`.
