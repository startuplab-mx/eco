@AGENTS.md

# eco

Canal anónimo + radar + tablero de patrones de reclutamiento para planteles CONALEP (Embajada de EE. UU. × StartupLab MX). La especificación vive en `docs/especificacion.md`; es la fuente de verdad.

Estado actual: mockup sin funciones (Next.js 16, App Router, Tailwind 4). Datos en `lib/mock/`, sin IA ni base de datos. `npm run dev`, `npm run build`, `npm run lint`.

## Reglas no negociables

- Nunca guardar IP, user agent, cookies ni identificadores de dispositivo.
- Hora se guarda como fecha + franja. Nunca timestamp exacto en tablas de mensajes.
- El texto original no se persiste; solo la versión limpia.
- Ninguna consulta agregada devuelve celdas o filas con menos de 5 registros.
- El tablero nunca expone texto libre ni actor_nombre.
- No hay código de seguimiento: nada liga a quien escribe con su mensaje, ni siquiera un código que guarde en el celular.
- Ante duda en gravedad, el modelo clasifica hacia arriba.
- Taxonomía, léxico, celdas y textos fijos viven en /config y no se editan en código.
- El chat no da consejos, no pide nombres, no promete acción. Los únicos textos hacia el estudiante son los de /config/textos.json más las repreguntas de campos faltantes.
- Todo en español de México, sin masculino genérico hacia quien escribe: "personas", "alguien", "estudiantes". Tampoco "compas", "otros 6" ni "no vayas solo".
- Nunca decirle a quien escribe que es la primera persona en contar algo. Si no hay parecidos, el cierre le da el total de su plantel: no está sola ni solo.
- El reclutamiento no es solo de chavos. Toda categoría, ejemplo o dato debe cubrir también las vías que afectan más a chavas: relación o "novio" mayor, regalos, fotos, "trabajo de modelo", fiestas, trata.

## Convenciones del mockup

- Lado del estudiante: siempre oscuro, sin logo de CONALEP, sin las palabras "denuncia" ni "sistema" en pantalla.
- Tablero: tokens de color en `app/globals.css` bajo `.tablero`, con modo oscuro propio. Paleta de gráficas validada para daltonismo; no agregar colores sin validarlos.
- Conteos de 1 a 4 se muestran como "< 5" con el componente `Cuenta`.
