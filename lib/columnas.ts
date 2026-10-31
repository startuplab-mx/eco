// Una columna de Airtable por cada pregunta con opciones (rúbrica v0.3).
// Escalas (frecuencia, qué tanto, termómetro): número 0–4, para sacar promedios. Lo demás: la etiqueta en palabras.
// Las columnas que ya existían (emociones, termómetro, cuerpo…) conservan su nombre.

export type Columna = { paso: string; nombre: string };

/** Columnas que ya existían antes de esta tabla. */
export const COLUMNAS_PREVIAS: Columna[] = [
  { paso: "en_emociones", nombre: "Emociones" },
  { paso: "en_sensacion", nombre: "Sensación" },
  { paso: "en_termometro", nombre: "Termómetro inicial" },
  { paso: "en_cuerpo", nombre: "Zona del cuerpo" },
  { paso: "en_tiempo", nombre: "Desde cuándo" },
  { paso: "en_ambito", nombre: "Ámbito" },
  { paso: "ci_termometro", nombre: "Termómetro final" },
  { paso: "ci_ahora", nombre: "Cómo termina" },
];

/** Columnas nuevas: una por pregunta. El prefijo es la variable, para que se ordenen juntas. */
export const COLUMNAS: Columna[] = [
  { paso: "v1_colonia", nombre: "V1 · Cosas que dan miedo en la colonia" },
  { paso: "v1_escuela", nombre: "V1 · Peligro en la escuela o el camino" },
  { paso: "v1_enterado", nombre: "V1 · Supo de algo grave a alguien que conoce" },
  { paso: "v2_miedo", nombre: "V2 · Miedo a que le pase algo" },
  { paso: "v2_alerta", nombre: "V2 · No puede relajarse" },
  { paso: "v2_dormir", nombre: "V2 · Le cuesta dormir por pensar" },
  { paso: "v3_triste", nombre: "V3 · Triste o sin ganas" },
  { paso: "v3_desesperanza", nombre: "V3 · Las cosas no van a mejorar" },
  { paso: "v4_enojo", nombre: "V4 · Siente que va a explotar" },
  { paso: "v5_lealtad", nombre: "V5 · No puede contar algo para proteger a alguien" },
  { paso: "v5_culpa", nombre: "V5 · Culpa por algo que no puede platicar" },
  { paso: "v6_normal", nombre: "V6 · La violencia se ve normal donde vive" },
  { paso: "v6_dinero", nombre: "V6 · Vale la pena el dinero rápido aunque sea peligroso" },
  { paso: "v7_presion", nombre: "V7 · Presión para hacer cosas peligrosas" },
  { paso: "v7_libertad", nombre: "V7 · Podría decir que no" },
  { paso: "v8_cinco", nombre: "V8 · Se imagina su vida en 5 años" },
  { paso: "v8_escuela", nombre: "V8 · Importancia de terminar la escuela" },
  { paso: "mh_posible", nombre: "V8 · Cree que puede lograr lo que quiere ser" },
  { paso: "v9_adulto", nombre: "V9 · Tiene un adulto de confianza" },
  { paso: "v9_amigos", nombre: "V9 · Tiene amistades de confianza" },
  { paso: "v9_estrategias", nombre: "V9 · Qué hace cuando se siente mal" },
  { paso: "mc_perdida", nombre: "V10 · Perdió a alguien importante" },
  { paso: "mc_duele", nombre: "V10 · Cuánto le sigue doliendo" },
  { paso: "ma_parte", nombre: "V11 · Se siente parte de su escuela" },
  { paso: "ma_maestro", nombre: "V11 · Tiene un maestro o maestra de confianza" },
  { paso: "ma_cambiar", nombre: "V11 · Qué cambiaría de su escuela" },
  { paso: "mb_carino", nombre: "V12 · Cariño en casa" },
  { paso: "mb_tension", nombre: "V12 · Ambiente pesado en casa" },
  { paso: "mb_hablar", nombre: "V12 · Puede platicar en casa lo que siente" },
  { paso: "md_valiosa", nombre: "V13 · Siente que vale como persona" },
  { paso: "md_bien_ayuda", nombre: "V13 · Fortalezas" },
  { paso: "me_imagenes", nombre: "V14 · Recuerdos feos sin querer" },
  { paso: "me_evito", nombre: "V14 · Evita lugares, ruidos o personas" },
  { paso: "me_sobresalto", nombre: "V14 · Se asusta fácil con ruidos" },
  { paso: "me_psicologo", nombre: "V14 · Quiso saber dónde buscar apoyo" },
  { paso: "mf_consumo", nombre: "V15 · Toma, vapea o usa sustancias cuando se siente mal" },
  { paso: "mf_motivo", nombre: "V15 · Para qué le ayuda" },
  { paso: "mg_contenido", nombre: "V16 · Ve contenido de armas, dinero fácil o grupos criminales" },
  { paso: "mg_sientes", nombre: "V16 · Cómo se siente con ese contenido" },
  { paso: "mh_admiras", nombre: "V17 · A quién admira" },
  { paso: "md_salir", nombre: "V18 · Siente que puede salir adelante" },
  { paso: "mi_acudir", nombre: "V19 · A quién acudiría" },
  { paso: "mi_impide", nombre: "V19 · Qué le frenaría para pedir ayuda" },
];

export const TODAS_LAS_COLUMNAS: Columna[] = [...COLUMNAS_PREVIAS, ...COLUMNAS];
export const SALTADAS = "Preguntas que saltó";
