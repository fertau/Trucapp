# Trucapp – Wireframes Funcionales (Documento Maestro)

Este documento describe los wireframes funcionales de Trucapp.
No son diseños visuales finales, sino definiciones claras de layout,
flujo e interacción. Deben respetarse como constraints.

============================================================

SCREEN 0 – Selector de cuenta (Cuentas recordadas)

[ Trucapp ]

CUENTAS RECORDADAS EN ESTE DISPOSITIVO
-------------------------------------
[ Avatar ]  fertau        → Ingresar
[ Avatar ]  joactau       → Ingresar
[ Avatar ]  invitado123   → Ingresar   (⋮ Quitar de este dispositivo)

[ + Agregar / Crear cuenta ]

Notas:
- Cuenta = nombre + avatar + PIN.
- “Quitar de este dispositivo” NO elimina la cuenta global.
- PIN se solicita al ingresar.

============================================================

SCREEN 1 – Inicio

[ Trucapp ]

[NUEVO PARTIDO]
[HISTORIAL]
[ESTADÍSTICAS]

Últimos partidos
----------------
Fernando+Julián 15 — 12 Yoel+Alex
Yoel+Alex 30 — 18 Fernando+Julián

============================================================

SCREEN 2 – Nuevo Partido / Paso 1: Cantidad de jugadores

¿Cuántos juegan?

[ 2 jugadores ]   (1v1)
[ 4 jugadores ]   (2v2)
[ 6 jugadores ]   (3v3 Pica-pica)

============================================================

SCREEN 3 – Nuevo Partido / Paso 2: Elegir jugadores

Elegí jugadores (4)

[ Avatar ] Fernando   [+]
[ Avatar ] Julián     [+]
[ Avatar ] Yoel       [+]
[ Avatar ] Alex       [+]

[ + Crear jugador ]

Notas:
- Crear jugador inline: nombre + avatar + PIN.
- Flujo rápido, sin salir del setup.

============================================================

SCREEN 4 – Nuevo Partido / Paso 3: Armar equipos y Parejas (2v2)

ARMAR EQUIPOS

NOSOTROS                          ELLOS
-----------------------------------------
[ Fernando ]                      [ Yoel ]
[ Julián   ]                      [ Alex ]

Pareja (Nosotros): [ Fernando + Julián ]   (Guardar / Editar nombre)
Pareja (Ellos):    [ Yoel + Alex ]         (Guardar / Editar nombre)

[ Auto ]   [ Manual (drag & drop) ]

Metadata del partido
--------------------
Sede:  ______________________
Fecha: 2026-01-28 21:30  (editable)

[ Comenzar partido ]

Notas:
- Las parejas son entidades reutilizables.
- El partido cuenta para jugadores y parejas.

============================================================

SCREEN 5 – Partido en vivo (Scoreboard)

NOSOTROS                     ELLOS
---------------------------------
[ □\ ]                       [ □\ ]
[ □  ]                       [ □  ]
[ □  ]                       [ □  ]

----------- BUENAS -----------

(Tocar NOSOTROS suma 1)
(Tocar ELLOS suma 1)

---------------------------------
ENVIDO             TRUCO
[ Envido ]         [ Truco ]
[ Real Envido ]    [ Retruco ]
[ Falta Envido ]   [ Vale 4 ]

[ UNDO ]

Notas:
- Cada cuadrado = 5 puntos.
- Lados = puntos 1–4.
- Diagonal = punto 5.
- Línea horizontal separa Malas y Buenas.
- UNDO siempre visible.

============================================================

SCREEN 6 – Modal Falta Envido

FALTA ENVIDO

Score actual:
Nosotros: 18
Ellos:    22

Sugerencia:
Sumar 8 puntos

[ Confirmar ]   [ Ajustar manualmente ]

Notas:
- Nunca se aplica automáticamente.
- Usuario siempre confirma.

============================================================

SCREEN 7 – Pica-pica (3v3) Setup

PICA-PICA

Objetivo: [ 10 ] (5–25)

Emparejamientos:
Fernando  vs Yoel    (Mano: Fernando)
Julián    vs Alex    (Mano: Alex)
Luis      vs Pablo   (Mano: Luis)

[ Empezar pica-pica ]

============================================================

SCREEN 8 – Pica-pica Board

PICA-PICA — 2/3 jugados

[ Fernando vs Yoel ]   ✔ Ganó Fernando
[ Julián   vs Alex ]   ▶ Jugar
[ Luis     vs Pablo ]  ⏳ Pendiente

Notas:
- Cada cruce abre el mismo scoreboard.
- Resultados se guardan por cruce.

============================================================

SCREEN 9 – Historial (con filtros)

HISTORIAL

[ Filtro: Jugador / Pareja / Pica-pica ]
[ Pareja:  (dropdown) ]
[ Sede:    (dropdown / search) ]

Hoy – Nordelta
Fernando+Julián  15 — 12  Yoel+Alex   21:40

Ayer – Casa Yoel
Yoel+Alex        30 — 18  Fernando+Julián  23:10

============================================================

SCREEN 10 – Cara a cara (Parejas)

CARA A CARA (PAREJAS)
Fernando+Julián  vs  Yoel+Alex

Resumen
-------
Partidos: 18
Ganó F+J: 10
Ganó Y+A: 8
Dif. puntos: +12 (F+J)
Estado de forma (últimos 5): W W L W L

[ Ver partidos ]
----------------
2026-01-20 – Nordelta   F+J 15 — 12 Y+A
2026-01-18 – Casa Yoel  Y+A 30 — 18 F+J

============================================================

FIN DEL DOCUMENTO
