# Visitas Passline

Formulario móvil de visitas comerciales para Passline Argentina. No requiere
login, funciona desde el celular y guarda cada carga automáticamente en la
pestaña **Visitas** de este Google Sheet:

https://docs.google.com/spreadsheets/d/1fVgcUlEH3tcXEDmFnFyKYoH_HAdoeaeceZ6UHRvTmHI

La pestaña **Dashboard** arma solo, con fórmulas, una tabla pivote de
visitas por comercial/semana y una tabla de estado de cuenta por semana.

Es un **Google Apps Script Web App** (todo el código está en `apps-script/`).
No hay servidor propio ni credenciales que gestionar: Google aloja la app y
escribe directo en el Sheet.

## Qué hace

- Formulario mobile-first, fondo negro `#0d0d0d` / amarillo `#F5A800`, con el
  logo de Passline.
- Campos: Comercial, Fecha y hora, Cliente visitado, Contacto, Estado de la
  cuenta, Temas charlados, Próximos pasos, Foto (obligatoria).
- La foto se comprime en el propio celular (canvas, máx. ~1400px, JPEG) antes
  de enviarse, así entra rápido incluso con mala señal.
- Cada envío guarda una fila en **Visitas** y la foto en una carpeta de
  Drive ("Passline - Fotos de Visitas"), con el link guardado en la fila.
- **Dashboard** recalcula solo con `QUERY` de Sheets: no depende de que el
  script "arme" nada extra en cada carga.

## Deploy (una sola vez)

1. Abrí el Google Sheet de arriba → **Extensiones → Apps Script**.
2. Si aparece un `Code.gs` vacío de ejemplo, borralo.
3. Creá estos 3 archivos en el editor de Apps Script y pegá el contenido de
   este repo:
   - `Code.gs` ← `apps-script/Code.gs`
   - `Index.html` (tipo **HTML**, no script) ← `apps-script/Index.html`
   - Archivo de manifiesto (activalo con el ícono ⚙️ **Project Settings →
     Show "appsscript.json" manifest file**) ← `apps-script/appsscript.json`
4. En el desplegable de funciones (arriba, al lado del ícono ▶️) elegí
   `ensureSheets_` y hacé clic en **Ejecutar**. La primera vez te va a pedir
   autorizar permisos (Sheets + Drive) — es tu propia cuenta, aceptá. Esto
   crea/repara las pestañas **Visitas** y **Dashboard** con sus headers y
   fórmulas.
5. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo (tu cuenta)**.
   - Quién tiene acceso: **Cualquier usuario**.
   - Implementar → copiá la URL que te da (termina en `/exec`).
6. Esa URL es el formulario. Compartila con el equipo comercial; se puede
   agregar a la pantalla de inicio del celular como si fuera una app.

### Si editás el código más adelante

Los cambios no se publican solos: **Implementar → Administrar
implementaciones → ✏️ (editar) → Nueva versión → Implementar**, así la URL
existente queda actualizada.

## Estructura del Sheet

**Visitas** (una fila por carga): Marca temporal, Comercial, Fecha y hora
visita, Cliente visitado, Contacto, Estado de la cuenta, Temas charlados,
Próximos pasos, Foto (link a Drive), Semana (`AAAA-Sww`, calculada por el
script para agrupar el Dashboard).

**Dashboard**: dos tablas `QUERY` (filas A2 y A21) que se recalculan solas a
medida que entran filas nuevas en Visitas — no hace falta tocarlas.

## Notas

- Como es una cuenta de Gmail personal (no Workspace), las fotos se
  comparten como "cualquiera con el link" dentro de la carpeta de Drive del
  dueño del script, para que el link del Sheet siempre abra. Tenelo en
  cuenta si las fotos pueden incluir información sensible del cliente.
- Todo corre bajo la cuenta que hizo el deploy (`Ejecutar como: Yo`), por
  eso nadie necesita loguearse para cargar una visita.
