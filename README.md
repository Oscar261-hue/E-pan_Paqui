# E-Pan

La configuración de SQLite y los comandos manuales están documentados en [SQLITE.md](./SQLITE.md).

Tienda para panadería mexicana construida con Next.js, TypeScript, SQLite y Prisma.

## Configurar SQLite

La configuración local usa SQLite mediante `DATABASE_URL="file:./dev.db"`; la base queda en `prisma/dev.db`. `.env` contiene la configuración local y no debe compartirse. En `.gitignore` ya están excluidos `.env` y `.env.*`, excepto `.env.example`.

1. No necesitas instalar un servidor de base de datos: SQLite usa un archivo local.
2. Verifica que `.env` tenga `DATABASE_URL="file:./dev.db"`. No compartas ni subas `.env`.
3. Genera un secreto de sesión local con PowerShell: `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))`; coloca el resultado en `AUTH_SECRET`. No uses el marcador de ejemplo en producción.
4. Reinicia `npm run dev` después de cambiar `.env`.

La base SQLite se crea al ejecutar el comando de sincronización. No se crea ni modifica ninguna base hasta que ejecutes manualmente ese comando.

## Esquema y datos

No hay migraciones SQL versionadas en este checkout: solo existe `prisma/schema.prisma`, y el script actual de desarrollo usa `prisma db push`. No se aplicó ninguna operación porque no hay URL de base de datos configurada.

Con una base vacía de desarrollo, revisa la URL y ejecuta `npm run db:push`, luego `npm run db:seed`. `db:push` sincroniza el esquema y no equivale a ejecutar migraciones versionadas. Antes de apuntarlo a una base con datos, respáldala y revisa el diff; no aceptes un reset automático si Prisma lo propone. Para producción, prepara y revisa una estrategia de baseline/migración con el esquema real existente antes de aplicar cambios.

El seed agrega productos demo solo cuando no existen y no sobrescribe los productos ya editados. Sin `ADMIN_EMAIL` y `ADMIN_PASSWORD`, no crea una cuenta administrativa. Si se define solo una de esas variables, se detiene con error. Para crear o rotar el primer administrador en PowerShell, define ambos temporalmente en la consola, con una contraseña de 12 caracteres o más, y ejecuta `npm run db:seed`. No se publica una cuenta ni contraseña predeterminada; elimina esas variables de la consola al terminar. Después inicia sesión en `/admin`.

## Panel administrativo

- `/admin`: inicio de sesión y atención de pedidos.
- `/admin/productos`: crear productos y editar nombre, descripción, precio MXN, categoría, URL HTTPS de imagen, estado activo, existencias y preparación bajo pedido.
- Los endpoints de lectura/escritura verifican la sesión firmada y confirman el rol actual en la base de datos. No existe registro público. Los cambios de producto e inventario generan registros de auditoría/movimiento.
- El pago se muestra en modo de solo lectura. La interfaz no puede confirmar un pago; ese estado depende de la verificación del webhook de Mercado Pago.
- Las transiciones de pedido se validan en servidor. Un pedido pagado no se puede cancelar desde este panel sin un flujo de reembolso.

El catálogo público lee los productos activos de SQLite; cambios se reflejan tras revalidación de caché (hasta 60 segundos). Si la base no está accesible, devuelve `503` y registra solo el tipo/código del error, no la URL de conexión.

## Service Worker

El repositorio no tenía `public/sw.js` ni código de registro (`navigator.serviceWorker`). Next sirve ahora `public/sw.js` como respuesta de compatibilidad para clientes/navegadores con una petición antigua. El archivo no registra listeners de `fetch`, no crea caché y no habilita modo offline; Next sigue atendiendo las páginas normalmente. No se añadió una estrategia PWA.

## Comandos

- `npm install`
- `npm run db:push` (solo después de configurar una base de desarrollo correcta)
- `npm run db:seed` (opcional; demo y primer administrador)
- `npm run dev`
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

La creación/consulta real de productos y pedidos, y las pruebas de escritura administrativa, requieren que el archivo SQLite esté inicializado. Las credenciales de Mercado Pago son independientes y solo se necesitan para iniciar y verificar pagos.
