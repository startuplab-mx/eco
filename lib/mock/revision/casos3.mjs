// Segunda revisión adversarial del chat (25 sep 2026). Mensajes nuevos, distintos de
// lib/mock/revision/casos.mjs, casos2.mjs y conversacion.test.ts.
// Mismo formato: { id, t, clase, p, cierre?, limpio?, sinCambio? }.
//   clase: string o lista de clases aceptables.
//   p: secuencia esperada de campos, incluida la pregunta que queda abierta (null = no se evalúa).
// Campos extra (revisar.mjs los ignora):
//   lugar: celda esperada en detectar(t[0]).lugar.
//   contiene: texto que debe sobrevivir a la limpieza.
export const CASOS = [
  // ---------- Riesgo: formas verbales con pronombre al final (enclíticos) ----------
  { id: "N001", t: ["dicen que van a matarme"], clase: "rojo", p: [] },
  { id: "N002", t: ["unos weyes quieren levantarme"], clase: "rojo", p: [] },
  { id: "N003", t: ["el wey de la moto dijo que va a matarlo"], clase: "rojo", p: [] },
  { id: "N004", t: ["le quieren hacer daño a mi hermana"], clase: "rojo", p: [] },
  { id: "N005", t: ["me van a hacer daño"], clase: "rojo", p: [] },
  // ---------- Riesgo: amenaza citada en primera persona ----------
  { id: "N006", t: ["me dijo te voy a matar"], clase: "rojo", p: [] },
  { id: "N007", t: ["me llego un mensaje: te vamos a levantar"], clase: "rojo", p: [] },
  { id: "N008", t: ["me escribieron por whats ya sabemos donde vives"], clase: "rojo", p: [] },
  { id: "N009", t: ["me llamo desde un numero desconocido y me dijo que sabe donde vivo"], clase: "rojo", p: [], sinCambio: true },
  { id: "N010", t: ["me escribio un wey: te espero en la esquina a las 7, no faltes"], clase: "rojo", p: [] },
  // ---------- Riesgo: consecuencias y amenazas veladas ----------
  { id: "N011", t: ["me dijeron que si digo algo me va a pasar algo"], clase: "rojo", p: [] },
  { id: "N012", t: ["dicen que vienen por mi"], clase: "rojo", p: [] },
  { id: "N013", t: ["me mataron a mi perro y dijeron que sigo yo"], clase: "rojo", p: [] },
  { id: "N014", t: ["me van a dar una madriza a la salida"], clase: "rojo", p: [] },
  // ---------- Riesgo: espera y seguimiento en singular ----------
  { id: "N015", t: ["un señor me esta esperando en la esquina de la escuela"], clase: "rojo", p: [] },
  { id: "N016", t: ["el wey dijo que me va a esperar a la salida"], clase: "rojo", p: [] },
  { id: "N017", t: ["un wey me sigue desde la parada hasta mi casa"], clase: "rojo", p: [] },
  { id: "N018", t: ["un carro me persiguio hasta mi casa"], clase: "rojo", p: [] },
  { id: "N019", t: ["unos weyes en moto estan vigilando mi casa"], clase: "rojo", p: [] },
  // ---------- Riesgo: cita concreta sin "vea/nos vemos" ----------
  { id: "N020", t: ["me dijo que vaya mañana a las 6 a la base de combis por el paquete"], clase: "rojo", p: [] },
  // ---------- Riesgo: traslado en singular o con otros verbos ----------
  { id: "N021", t: ["un señor se llevo a una chava de la secundaria en su carro"], clase: "rojo", p: [] },
  { id: "N022", t: ["se la llevo un wey en una moto y no sabemos nada"], clase: "rojo", p: [] },
  { id: "N023", t: ["unos weyes me quisieron subir a una camioneta saliendo del cona"], clase: "rojo", p: [] },
  { id: "N024", t: ["metieron a mi primo a una camioneta blanca"], clase: "rojo", p: [] },
  { id: "N025", t: ["me apuntaron con una pistola para que me subiera a su carro"], clase: "rojo", p: [] },
  // ---------- Riesgo: retención ----------
  { id: "N026", t: ["estoy encerrado en un cuarto y no se donde estoy"], clase: "rojo", p: [] },
  { id: "N027", t: ["unos weyes me tienen en una casa y no me dejan irme"], clase: "rojo", p: [] },
  // ---------- Riesgo: desaparición con otras palabras ----------
  { id: "N028", t: ["mi hermanito no aparece"], clase: "rojo", p: [] },
  { id: "N029", t: ["mi vecina desaparecio desde el viernes"], clase: "rojo", p: [] },
  { id: "N030", t: ["mi primo no llego a dormir y no contesta"], clase: "rojo", p: [] },
  { id: "N031", t: ["mi amigo desaparesio desde el lunes"], clase: "rojo", p: [] },
  // ---------- Riesgo: extorsión sin la palabra exacta ----------
  { id: "N032", t: ["me estan extorcionando"], clase: "rojo", p: [] },
  { id: "N033", t: ["me amenasaron en la parada"], clase: "rojo", p: [] },
  { id: "N034", t: ["nos cobran cuota a todos los del tianguis"], clase: "rojo", p: [] },
  { id: "N035", t: ["mi papa tiene que pagar piso para vender en el mercado"], clase: "rojo", p: [] },
  { id: "N036", t: ["dice que va a subir mis fotos si no le mando dinero"], clase: "rojo", p: [] },
  // ---------- Riesgo: violencia sexual en presente o en otra forma ----------
  { id: "N037", t: ["mi padrastro me viola"], clase: "rojo", p: [] },
  { id: "N038", t: ["abusaron de una compa en el baño"], clase: "rojo", p: [] },
  { id: "N039", t: ["mi novio me obligo a tener relaciones"], clase: "rojo", p: [] },
  { id: "N040", t: ["el tio de mi amiga abuso sexualmente de ella"], clase: "rojo", p: [] },
  { id: "N041", t: ["me biolaron"], clase: "rojo", p: [] },
  // ---------- Riesgo: ataque anunciado a la escuela ----------
  { id: "N042", t: ["un chavo de mi salon dijo que va a traer una pistola para matar a los que lo molestan"], clase: "rojo", p: [] },
  { id: "N043", t: ["dicen que el viernes va a haber una balacera en el cona"], clase: "rojo", p: [] },
  // ---------- Riesgo: pedidos de ayuda ----------
  { id: "N044", t: ["porfavor ayuda"], clase: "rojo", p: [] },
  { id: "N045", t: ["porfa ayuda"], clase: "rojo", p: [] },
  { id: "N046", t: ["que alguien me ayude"], clase: "rojo", p: [] },
  { id: "N047", t: ["alguien me puede ayudar?"], clase: "rojo", p: [] },
  { id: "N048", t: ["hola ayuda"], clase: "rojo", p: [] },
  { id: "N049", t: ["necesito ayudaa"], clase: "rojo", p: [] },
  // ---------- Riesgo: escritura de celular ----------
  { id: "N050", t: ["m kieren levantar"], clase: "rojo", p: [] },
  { id: "N051", t: ["tengo mucho miedo me dijeron q m iban a levantar"], clase: "rojo", p: [] },
  { id: "N052", t: ["me ban a lebantar"], clase: "rojo", p: [] },
  { id: "N053", t: ["me kieren madriar a la salida"], clase: "rojo", p: [] },
  { id: "N054", t: ["mevanamatar"], clase: "rojo", p: [] },
  // ---------- Riesgo en la respuesta ----------
  { id: "N055", t: ["me ofrecieron un jale", "en la parada, y me dijo que si no voy van a ir por mi"], clase: "rojo", p: ["lugar"] },
  { id: "N056", t: ["un wey afuera nos ofrecio lana", "en la esquina, y dijo que van a matarme si hablo"], clase: "rojo", p: ["lugar"] },
  { id: "N057", t: ["hay unos que venden en la parada", "en las noches, y hoy me dijeron que me va a pasar algo"], clase: "rojo", p: ["cuando"] },

  // ---------- Autolesión no detectada ----------
  { id: "N058", t: ["me voy a matar"], clase: "autolesion", p: [] },
  { id: "N059", t: ["quiero morirme"], clase: "autolesion", p: [] },
  { id: "N060", t: ["anoche me corte otra vez"], clase: "autolesion", p: [] },
  { id: "N061", t: ["me hago daño cuando estoy triste"], clase: "autolesion", p: [] },
  { id: "N062", t: ["me tome muchas pastillas"], clase: "autolesion", p: [] },
  { id: "N063", t: ["mejor me mato"], clase: "autolesion", p: [] },
  { id: "N064", t: ["me quiero aventar del puente"], clase: "autolesion", p: [] },
  { id: "N065", t: ["pienso en matarme"], clase: "autolesion", p: [] },
  { id: "N066", t: ["ya no quiero seguir aqui"], clase: "autolesion", p: [] },

  // ---------- Serio tratado como broma ("prueba", "probar", "testigo") ----------
  { id: "N067", t: ["tengo pruebas de que el profe se mete con alumnas"], clase: "serio", p: null },
  { id: "N068", t: ["me dieron a probar una pastilla en el receso y me senti mal"], clase: "serio", p: null },
  { id: "N069", t: ["soy testigo de lo que hace el prefecto con las chavas"], clase: "serio", p: null },
  { id: "N070", t: ["una compa salio positiva en la prueba de embarazo y dice que fue el profe"], clase: ["serio", "rojo"], p: null },
  { id: "N071", t: ["esto no es prueba, un señor nos sigue diario desde la parada"], clase: ["serio", "rojo"], p: null },
  { id: "N072", t: ["unos de quinto andan probando pastillas en el baño"], clase: "serio", p: ["cuando"] },
  { id: "N073", t: ["estoy solo"], clase: ["serio", "rojo"], p: null },

  // ---------- Falsos rojos ----------
  { id: "N074", t: ["los de quinto me caen mal porque venden vapes en el baño"], clase: "serio", p: ["cuando"] },
  { id: "N075", t: ["me levantaron un reporte por pelear en el patio"], clase: "serio", p: ["cuando"] },
  { id: "N076", t: ["el prefecto dijo que me van a llevar a la direccion"], clase: "serio", p: null },
  { id: "N077", t: ["la orientadora me anda buscando por lo de la pelea"], clase: "serio", p: null },
  { id: "N078", t: ["un señor raro me esta siguiendo en insta y le da like a todo"], clase: "serio", p: [] },
  { id: "N079", t: ["unos weyes de la maña me siguieron en tiktok"], clase: "serio", p: [] },
  { id: "N080", t: ["la maestra socorro nos grita y nos dice burros"], clase: "serio", p: ["cuando"] },
  { id: "N081", t: ["el profe de quimica no ha regresado desde que lo acusaron de acoso"], clase: "serio", p: null },
  { id: "N082", t: ["los prefectos se llevaron a mi compa a la direccion por traer vape"], clase: "serio", p: null },
  { id: "N083", t: ["mi amiga me dijo que la vea en la biblioteca porque un wey de quinto la molesta"], clase: "serio", p: null },
  { id: "N084", t: ["cuando nos vemos en el salon el wey me insulta"], clase: "serio", p: null },
  { id: "N085", t: ["si no entrego el proyecto me va a cargar el payaso, el profe no me deja entrar"], clase: ["serio", "broma"], p: null },
  // Puede ser literal en una casa violenta: ante duda, hacia arriba.
  { id: "N086", t: ["si repruebo mi mama me va a matar"], clase: ["serio", "broma", "rojo"], p: null },
  // ---------- Falsas autolesiones ----------
  { id: "N087", t: ["un wey en moto me corto el paso en la parada y me ofrecio chamba"], clase: "serio", p: ["cuando"] },
  { id: "N088", t: ["un wey me corto con una navaja en la salida"], clase: ["rojo", "serio"], p: null },
  { id: "N089", t: ["me quiero morir de la pena, el profe leyo en voz alta mi recado"], clase: "serio", p: null },

  // ---------- Pregunta: falso "en línea" ----------
  { id: "N090", t: ["me di cuenta de que venden droga en el baño", "Pasa seguido"], clase: "serio", p: ["cuando"] },
  { id: "N091", t: ["lo vi en vivo, a un chavo lo golpearon en la parada ayer"], clase: "serio", p: [] },
  { id: "N092", t: ["me escribieron en el pizarron del salon groserias", "Pasa seguido"], clase: "serio", p: ["cuando"] },
  // ---------- Pregunta: falso lugar ----------
  { id: "N093", t: ["un wey tiene acceso a mi cuenta de insta y publica cosas feas"], clase: "serio", p: [] },
  { id: "N094", t: ["a base de golpes obligan a los de primero a vender"], clase: "serio", p: ["lugar"] },
  // ---------- Pregunta: celda equivocada ----------
  { id: "N095", t: ["en el patio de mi casa escondieron unas bolsas con droga"], clase: "serio", p: ["cuando"], lugar: "colonia" },
  { id: "N096", t: ["en el taller mecanico de la esquina guardan armas"], clase: "serio", p: ["cuando"], lugar: "colonia" },
  { id: "N097", t: ["un señor toco la puerta de mi casa preguntando por mi hermano"], clase: ["serio", "rojo"], p: null, lugar: "colonia" },
  { id: "N098", t: ["en el estacionamiento de la plaza venden droga"], clase: "serio", p: ["cuando"], lugar: "colonia" },
  // ---------- Pregunta: falso "cuándo" ----------
  { id: "N099", t: ["estoy en quinto y en la parada venden cristal"], clase: "serio", p: ["cuando"], limpio: "en la parada venden cristal" },
  // ---------- Pregunta: app ya dicha con otra escritura ----------
  { id: "N100", t: ["me escribieron por watsap ofreciendo chamba"], clase: "serio", p: ["oferta"] },
  { id: "N101", t: ["me mandaron mensaje por el feis que si queria jale"], clase: "serio", p: ["oferta"] },
  { id: "N102", t: ["en maincra un señor le pide fotos a mi hermanito"], clase: "serio", p: [] },
  // ---------- Pregunta: mensajes y llamadas sin la frase exacta ----------
  { id: "N103", t: ["un señor me mando un mensaje ofreciendome trabajo"], clase: "serio", p: ["medio"] },
  { id: "N104", t: ["me marcaron de un numero que no conozco y me ofrecieron trabajo"], clase: "serio", p: ["oferta"] },
  { id: "N105", t: ["me llegan mensajes de un numero raro ofreciendo dinero"], clase: "serio", p: ["medio"] },
  { id: "N106", t: ["me mandaron una foto de un arma por privado"], clase: "serio", p: ["medio"] },
  // ---------- Pregunta: lugares que faltan ----------
  { id: "N107", t: ["en el mototaxi un señor nos ofrecio chamba de halcon"], clase: "serio", p: ["cuando"] },
  { id: "N108", t: ["en el autobus un señor se le repego a mi amiga"], clase: "serio", p: ["cuando"] },
  { id: "N109", t: ["dentro del conalep venden vapes"], clase: "serio", p: ["cuando"] },
  { id: "N110", t: ["en clases un compa trae una navaja"], clase: "serio", p: ["cuando"] },
  { id: "N111", t: ["en el puente peatonal asaltan a los del cona"], clase: "serio", p: ["cuando"] },
  // ---------- Pregunta: tiempos que faltan ----------
  { id: "N112", t: ["saliendo del cona unos weyes nos ofrecen mota en la esquina"], clase: "serio", p: [] },
  { id: "N113", t: ["la otra vez en la parada un wey nos ofrecio 2 mil por cuidar un carro"], clase: "serio", p: [] },
  { id: "N114", t: ["hace como una semana en la parada nos ofrecieron jale de halcon"], clase: "serio", p: [] },
  { id: "N115", t: ["todas las tardes se ponen unos weyes a vender en la esquina"], clase: "serio", p: [] },
  { id: "N116", t: ["en la entrada a las siete se pone un wey a vender"], clase: "serio", p: [] },
  { id: "N117", t: ["esta tarde en la parada un wey me ofrecio mota"], clase: "serio", p: [] },
  { id: "N118", t: ["cuando iba a la escuela un wey en la esquina me ofrecio 500 por llevar un paquete"], clase: "serio", p: [] },
  { id: "N119", t: ["hace un ratito en la parada unos weyes me ofrecieron 500 por avisar"], clase: "serio", p: [] },
  // ---------- Pregunta: oferta ----------
  { id: "N120", t: ["me ofrecieron chamba de 5k a la semana en la parada ayer"], clase: "serio", p: [] },
  { id: "N121", t: ["me ofrecieron chamba de cinco mil a la semana en la parada ayer"], clase: "serio", p: [] },
  { id: "N122", t: ["un wey en el camion queria quitarme mi dinero ayer"], clase: "serio", p: [] },
  { id: "N123", t: ["en la esquina me ofrecieron trabajo de sicario ayer"], clase: "serio", p: [] },
  // ---------- Pregunta: maestro ----------
  { id: "N124", t: ["profe, unos weyes en la parada ofrecen chamba de halcon a los de primero todos los dias"], clase: "serio", p: [], cierre: "parecidos" },
  { id: "N125", t: ["la miss de ingles nos grita y nos insulta", "Pasa seguido"], clase: "serio", p: ["cuando"], cierre: "sin_parecidos" },
  { id: "N126", t: ["el inge de electricidad nos pide dinero para pasar", "Pasa seguido"], clase: "serio", p: ["cuando"], cierre: "sin_parecidos" },
  // Ejemplo literal de docs/repreguntas.md ("se tratan las dos partes"): el doc espera cuándo.
  { id: "N127", t: ["me escribieron por insta para vernos en la parada"], clase: ["serio", "rojo"], p: null },
  // ---------- Pregunta: respuestas de texto libre ----------
  { id: "N128", t: ["me ofrecieron un jale", "atras de la escuela"], clase: "serio", p: ["lugar", "cuando"] },
  { id: "N129", t: ["me ofrecieron un jale", "ya no me acuerdo"], clase: "serio", p: ["lugar", "oferta"] },
  { id: "N130", t: ["me ofrecieron un jale", "q te importa"], clase: "serio", p: ["lugar"] },
  { id: "N131", t: ["me ofrecieron un jale", "nel, paso"], clase: "serio", p: ["lugar"] },
  { id: "N132", t: ["me ofrecieron un jale", "mejor no"], clase: "serio", p: ["lugar"] },

  // ---------- Limpieza ----------
  { id: "N133", t: ["hola soy juan y en la parada venden cristal"], limpio: "en la parada venden cristal" },
  { id: "N134", t: ["me dicen el chino y en la entrada venden mota"], limpio: "en la entrada venden mota" },
  { id: "N135", t: ["soy de primero cuando salimos un wey nos ofrece mota en la esquina"], contiene: "un wey nos ofrece mota en la esquina" },
  { id: "N136", t: ["un chavo me llamo gorda enfrente de todo el salon"], sinCambio: true },
  { id: "N137", t: ["en la entrada venden vapes, mi cel es 5512345678"], limpio: "en la entrada venden vapes" },
  { id: "N138", t: ["mi insta es @juanito_22 y un wey me acosa por dm"], limpio: "un wey me acosa por dm" },
  { id: "N139", t: ["voy en el 305 y el de la moto nos ofrece jale"], limpio: "el de la moto nos ofrece jale" },
  { id: "N140", t: ["en el baño venden piedra. saludos, Karla del 5C"], limpio: "en el baño venden piedra." },
  { id: "N141", t: ["soy la que le dijo al profe que el de quinto vende mota"], contiene: "el de quinto vende mota" },
  { id: "N142", t: ["me llamo ayer un wey para ofrecerme chamba"], sinCambio: true },

  // ---------- Control: variantes que deben pasar ----------
  { id: "N143", t: ["me quieren matar"], clase: "rojo", p: [] },
  { id: "N144", t: ["a mi compa lo andan buscando los de la maña"], clase: "rojo", p: [] },
  { id: "N145", t: ["Me Van A Matar"], clase: "rojo", p: [] },
  { id: "N146", t: ["me-van-a-levantar"], clase: "rojo", p: [] },
  { id: "N147", t: ["ME QUIEREN LEVANTAR!!!😭😭"], clase: "rojo", p: [] },
  { id: "N148", t: ["me tienen amenazado"], clase: "rojo", p: [] },
  { id: "N149", t: ["levantaron a mi tio"], clase: "rojo", p: [] },
  { id: "N150", t: ["en la parada venden cristal todos los dias"], clase: "serio", p: [] },
  { id: "N151", t: ["me ofrecieron un jale por insta"], clase: "serio", p: ["oferta"] },
  { id: "N152", t: ["jajaja"], clase: "broma", p: [] },
  { id: "N153", t: ["holi, prueba 123"], clase: "broma", p: [] },
  { id: "N154", t: ["jsjsjs prueba"], clase: "broma", p: [] },
  { id: "N155", t: ["vendn droga n l baño"], clase: "serio", p: ["cuando"] },
  { id: "N156", t: ["stan vendiendo cristal en la entrada diario"], clase: "serio", p: [] },
  { id: "N157", t: ["unos de la maña le ofrecieron a mi primo 3 mil por semana por halconear en la parada los viernes"], clase: "serio", p: [] },
  { id: "N158", t: ["en tiktok un wey ofrece jale a morros de secundaria"], clase: "serio", p: ["oferta"] },
  { id: "N159", t: ["en la salida hay pelea todos los dias en la esquina"], clase: "serio", p: [] },
  { id: "N160", t: ["k onda, stan vendiendo vapes afuera"], clase: "serio", p: ["lugar"] },
  { id: "N161", t: ["atras del cona venden mota en las tardes"], clase: "serio", p: ["lugar"] },
  { id: "N162", t: ["me ofrecieron un jale", "no se, en la calle creo"], clase: "serio", p: ["lugar", "cuando"] },
  { id: "N163", t: ["hay un wey que vende vapes", "por insta y en la entrada"], clase: "serio", p: ["lugar", "cuando"] },
  { id: "N164", t: ["me ofrecieron un jale", "no sé", "no sé"], clase: "serio", p: ["lugar", "oferta"] },
  { id: "N165", t: ["me ofrecieron un jale", "eso es todo"], clase: "serio", p: ["lugar"] },
  { id: "N166", t: ["un compa me mando videos de armas por telegram y dice que si le entro"], clase: "serio", p: ["oferta"] },
  { id: "N167", t: ["unos weyes de otra escuela nos esperan a la salida para pegarnos"], clase: "rojo", p: [] },
  { id: "N168", t: ["mi amiga no aparece desde ayer"], clase: "rojo", p: [] },
  { id: "N169", t: ["ya me quiero morir"], clase: "autolesion", p: [] },
  { id: "N170", t: ["la neta me estoy cortando"], clase: "autolesion", p: [] },
  // ---------- Segunda tanda ----------
  { id: "N171", t: ["un señor en la parada me quiere violar"], clase: "rojo", p: [] },
  { id: "N172", t: ["el novio de mi hermana me quiso violar"], clase: "rojo", p: [] },
  { id: "N173", t: ["me dijo te voy a partir tu madre"], clase: "rojo", p: [] },
  { id: "N174", t: ["cuando salga de la escuela me van a estar esperando"], clase: "rojo", p: [] },
  { id: "N175", t: ["ME ESTAN SIGIENDO"], clase: "rojo", p: [] },
  { id: "N176", t: ["ya saben quien soy y me dijeron que me cuide"], clase: "rojo", p: [] },
  { id: "N177", t: ["hola, alguien me ayuda?"], clase: "rojo", p: [] },
  { id: "N178", t: ["ocupo ayuda"], clase: "rojo", p: [] },
  { id: "N179", t: ["me acosan", "en la parada, y hoy me siguio hasta mi casa"], clase: "rojo", p: ["lugar"] },
  { id: "N180", t: ["me lastimo los brazos con el sacapuntas"], clase: "autolesion", p: [] },
  { id: "N181", t: ["me quiero dormir y no despertar"], clase: "autolesion", p: [] },
  { id: "N182", t: ["no le encuentro sentido a vivir"], clase: "autolesion", p: [] },
  { id: "N183", t: ["me quiero colgar"], clase: "autolesion", p: [] },
  { id: "N184", t: ["ayudame con la tarea de mate"], clase: ["serio", "broma"], p: null },
  { id: "N185", t: ["nos van a subir al camion para la excursion y hay unos que venden vapes"], clase: "serio", p: null },
  { id: "N186", t: ["en la clase de orientacion hablamos del suicidio de un chavo de otra escuela"], clase: ["serio", "autolesion"], p: null },
  { id: "N187", t: ["soy el Brayan del 5C y en la entrada venden mota"], limpio: "en la entrada venden mota" },
  { id: "N188", t: ["mi nombre: Ana Lopez, en la entrada venden"], limpio: "en la entrada venden" },
  { id: "N189", t: ["voy en 5to B y en la entrada venden cristal"], limpio: "en la entrada venden cristal" },
  { id: "N190", t: ["un señor en la parada se presento, dijo soy Toño y nos ofrecio jale"], sinCambio: true },
  { id: "N191", t: ["pd soy karla, en la parada venden cristal"], limpio: "en la parada venden cristal" },
  // "talleres?" exige "tallere": el singular "taller" nunca es adentro.
  { id: "N192", t: ["en el taller de soldadura un chavo vende mota"], clase: "serio", p: ["cuando"], lugar: "adentro" },
  { id: "N193", t: ["en el taller venden vapes todos los dias"], clase: "serio", p: [], lugar: "adentro" },
];
