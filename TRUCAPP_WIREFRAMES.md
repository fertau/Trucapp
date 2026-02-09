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
Nosotros 15 — Ellos 12
Ellos 30 — Nosotros 18

============================================================

SCREEN 2 – Nuevo Partido / Paso 1: Cantidad de jugadores

¿Cuántos juegan?

[ 2 jugadores ]   (1v1)
[ 4 jugadores ]   (2v2)
[ 6 jugadores ]   (3v3 Pica-pica)

============================================================

SCREEN 3 – Nuevo Partido / Paso 2: Elegir jugadores

Elegí jugadores (4)

[ Avatar ] Juan     [+]
[ Avatar ] Pedro    [+]
[ Avatar ] Ana      [+]
[ Avatar ] Nico     [+]

[ + Crear jugador ]

Notas:
- Crear jugador inline: nombre + avatar + PIN.
- Flujo rápido, sin salir del setup.

============================================================

SCREEN 4 – Nuevo Partido / Paso 3: Armar equipos

ARMAR EQUIPOS

NOSOTROS           ELLOS
-------------------------
[ Juan ]            [ Pedro ]
[ Ana  ]            [ Nico  ]

[ Auto ]   [ Manual (drag & drop) ]

[ Comenzar partido ]

============================================================

SCREEN 5 – Partido en vivo (Scoreboard)

NOSOTROS           ELLOS
---------------------------------
[ □\ ]             [ □\ ]
[ □  ]             [ □  ]
[ □  ]             [ □  ]

----------- BUENAS -----------

(Tocar NOSOTROS suma 1)
(Tocar ELLOS suma 1)

---------------------------------
ENVIDO        TRUCO
[ Envido ]    [ Truco ]
[ Real ]      [ Retruco ]
[ Falta ]     [ Vale 4 ]

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
Juan   vs Pedro   (Mano: Juan)
Ana    vs Nico    (Mano: Nico)
Luis   vs Pablo   (Mano: Luis)

[ Empezar pica-pica ]

============================================================

SCREEN 8 – Pica-pica Board

PICA-PICA — 2/3 jugados

[ Juan vs Pedro ]   ✔ Ganó Juan
[ Ana  vs Nico  ]   ▶ Jugar
[ Luis vs Pablo ]   ⏳ Pendiente

Notas:
- Cada cruce abre el mismo scoreboard.
- Resultados se guardan por cruce.

============================================================

SCREEN 9 – Historial

HISTORIAL

Nosotros 15 — Ellos 12
Nosotros 30 — Ellos 22
Ellos  30 — Nosotros 18

Notas:
- Cards compactas.
- En cara a cara: resumen primero, lista después.

============================================================

FIN DEL DOCUMENTO
