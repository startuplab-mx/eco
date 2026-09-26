# Revisión del chat (25 sep 2026)

## Qué se hizo

1. El chat dejó de hacer siempre las mismas dos preguntas. `lib/mock/conversacion.ts` detecta qué trae el mensaje y pregunta solo lo que falta. Las reglas están en `docs/repreguntas.md`.
2. Dos rondas de revisión adversarial. Un agente escribió mensajes como los mandaría un estudiante (jerga, abreviaturas, faltas, mensajes largos) y anotó qué debía pasar en cada uno. Esos casos se quedaron como pruebas.
   - Ronda 1: 180 casos, `lib/mock/revision/casos.mjs` y `casos2.mjs`. Antes de corregir fallaban 133.
   - Ronda 2: 193 casos nuevos, escritos para buscar variantes que la ronda 1 no cubría, en `lib/mock/revision/casos3.mjs`. Antes de corregir fallaban 163.
3. Con las correcciones, `npm test` pasa los 426 casos: 53 propios más 373 de revisión.

Cambios de fondo:

- **Broma** solo si todo el mensaje es relleno o si dice que está probando la app. Un mensaje corto con contenido ("me levantaron") es serio.
- **Riesgo inmediato** por combinaciones: persona con verbo de daño en cualquier forma ("me van a matar", "van a matarme", "te voy a matar"), consecuencias ("me va a pasar algo"), cita con hora, traslado, desaparición de una persona, retención, extorsión, violencia sexual y pedidos de ayuda. La comparación es fonética, así que "me ban a lebantar" o "extorcionando" también cuentan.
- **Falsos rojos** que se quitaron: "me caen mal", "me levantaron un reporte", "me van a llevar a la dirección", "la orientadora me anda buscando", "me siguen en TikTok".
- **Autolesión** separada del peligro, con su propio bloque fijo. No se confunde con "un wey me cortó con una navaja".
- **Bloque de peligro** con el texto que pidió Pedro: llamar al 911 y, si se puede, meterse a la escuela o a un lugar con gente.
- **Limpieza** que corta en la siguiente "y", "que" o coma, en vez de borrar hasta el final. Quita nombre, apodo, grupo, salón, semestre, matrícula, cel, usuario de redes y firma. Respeta el nombre de un tercero ("dijo soy Toño").

## Lo que hay que saber

**El motor del mockup es por palabras clave, y eso tiene un techo.** Pasa los 426 casos porque se corrigió contra ellos. Cada ronda nueva encuentra variantes que no conoce: en la ronda 2, 163 de 193 fallaban antes de corregir. Otra ronda encontraría más. Para el demo alcanza, pero no sirve como producto.

**En el sistema real esto lo hace el modelo** (Haiku, y Sonnet cuando la confianza es baja, según la especificación). Los 426 casos son el set de evaluación de la Fase 1: el prompt de extracción y el de repreguntas deben pasarlos antes de conectar la página. Eso sí se puede medir.

## Decisiones pendientes

- **Autolesión.** La especificación no la cubre. El bloque actual dice "Línea de apoyo: [por confirmar con especialistas]". La Línea de la Vida es la candidata. El texto lo deben validar especialistas.
- **Violencia pasada contra terceros sin amenaza** ("hubo balacera", "trae pistola en la mochila"). El chat la trata como seria, sin bloque de emergencia. La gravedad interna es roja y el plantel recibe el aviso. Hay que confirmarlo.
- **"Mi mamá me va a matar"** se toma como riesgo, por la regla de "ante duda, hacia arriba". Puede ser literal en una casa violenta.
- **Código de seguimiento.** Aporta poco y un código guardado en el celular puede delatar a quien contó algo. Propuesta: quitarlo del piloto.
