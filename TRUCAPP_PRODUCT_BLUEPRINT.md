# TRUCAPP - Documento de Producto (v2 acordado)

## 1) Objetivo de producto
Trucapp es una app social ligera para grupos de amigos que juegan Truco y quieren:
1. Registrar puntos rápido, sin fricción.
2. Guardar historial confiable por rivalidad/equipo/modalidad.
3. Ver resúmenes claros de rendimiento con foco en series y clásicos.

## 2) Principios rectores
1. Velocidad primero: cualquier acción crítica debe resolverse en 1-2 toques.
2. Integridad de datos: cada edición relevante deja traza y responsable.
3. Claridad visual: la jerarquía principal siempre es PJ -> G/P -> forma.
4. Todo en español de Argentina.
5. Mobile-first (PWA iOS/Android), safe areas y gestos consistentes.

## 3) Roles y permisos
### Roles
1. Invitado (sin sesión).
2. Usuario autenticado.
3. Participante de partido (usuario autenticado que jugó ese partido).
4. Admin.
5. Superadmin (usuario cuyo `player.id` coincide con `VITE_SUPERADMIN_USER_ID`).

### Matriz de permisos
| Acción | Invitado | Usuario | Participante | Admin | Superadmin |
|---|---|---|---|---|---|
| Ver Home | No | Sí | Sí | Sí | Sí |
| Registrar partido | No | Sí | Sí | Sí | Sí |
| Editar metadata de partido | No | No | Sí | Sí | Sí |
| Editar resultado de partido | No | No | Sí (con warning/auditoría) | Sí | Sí |
| Borrar partido | No | No | No | Sí (si es creador) | Sí |
| Borrar serie completa | No | No | No | Sí (si es creador de todos) | Sí |
| Borrar todo | No | No | No | No | Sí |
| Crear/gestionar usuarios | No | No | No | Sí | Sí |

## 4) Módulos funcionales
1. Partido.
2. Estadísticas.
3. Perfil.

### 4.1 Partido
1. Nuevo partido (1v1, 2v2, 3v3), a 15 o 30.
2. Atajos de puntos (envido/truco) y toque para +1.
3. Configuración in-game (cambiar objetivo 15/30 con confirmación).
4. Pica pica opcional dentro de partido normal a 30 (ver sección 7).
5. Modo "Anotador directo" sin registro por defecto (ver sección 6).

### 4.2 Estadísticas
1. Tab `Resumen`.
2. Tab `Partidos`.
3. Filtros por modalidad, rival, equipo, clásico, fecha.
4. Resumen por rivalidad con enfoque en series ganadas + desglose PJ/G/P.
5. Drill-down a detalle de series y partidos.

### 4.3 Perfil
1. Cuenta y sesión.
2. Avatar (predefinidos + subida propia).
3. Seguridad (PIN).
4. Admin/Superadmin (acciones sensibles solo si aplica).

## 5) Entidades de datos (alto nivel)
1. `Player`.
2. `Match`.
3. `Series` (best-of-3 u otro formato configurable).
4. `TeamRef` canónico por composición de jugadores.
5. `MatchEditLog` (quién, qué, cuándo).

### Reglas de integridad
1. Fecha de juego (`metadata.date`) es la fuente de verdad temporal.
2. Cálculos de rachas/tendencias siempre por orden cronológico real.
3. Si se edita resultado, se marca warning visible solo en ese partido/serie.
4. Sin warning si nunca hubo edición.

## 6) Especificación UX del bug actual: finalizar en anotador directo antes de terminar
### Problema
Hoy, en anotador directo, al finalizar antes de llegar al objetivo falta un flujo claro de decisión.

### Comportamiento esperado
Al tocar `FINALIZAR` y si ningún equipo alcanzó el objetivo:
1. Mostrar modal de decisión con 4 acciones.
2. Acción `Continuar partido`: cierra modal y vuelve al tablero.
3. Acción `Cambiar objetivo (15/30)`: abre selector; si con el nuevo objetivo ya hay ganador, pide confirmación final y cierra partido.
4. Acción `Guardar resultado actual`: crea registro histórico explícito con marcador actual, sin pedir fecha/sede adicional.
5. Acción `Cancelar partido`: descarta completamente, no guarda nada, vuelve a Home.

### Reglas
1. Nunca autoguardar en anotador directo.
2. Nunca autofinalizar sin confirmación explícita.
3. Si el usuario elige guardar, no se pide metadata adicional.

### Criterios de aceptación
1. En anotador directo incompleto, `FINALIZAR` siempre abre modal de decisión.
2. `Cancelar partido` no deja rastros en historial.
3. `Guardar resultado actual` genera un partido válido y visible en historial.
4. `Cambiar objetivo` respeta confirmación si altera el resultado final.

## 7) Lógica completa de Pica Pica (dentro del partido normal)
1. Disponible solo para 3v3 cuando el partido es a 30.
2. Configurable en setup: toggle + emparejamientos 1v1 únicos.
3. Ventana activa: cuando cualquier equipo está entre 20 y 25 (inclusive).
4. Rotación: mano de por medio, siguiendo orden de emparejamientos.
5. Es ayuda de registro y contexto visual, no motor de reglas del Truco.
6. Si se cambia objetivo a 15, Pica Pica se desactiva automáticamente para ese partido.

## 8) Series y rivalidades
1. Serie al mejor de 3 para enfrentamientos recurrentes.
2. En resumen de rivalidad, prioridad a series ganadas.
3. Segundo nivel: PJ/G/P de partidos individuales.
4. En Home, `Rivalidad activa` abre Estadísticas ya filtrado al clásico.
5. En listados, si hay serie, se muestra como entidad padre con apertura a partidos hijos.

## 9) Historial/estadísticas: diseño funcional simplificado
### Tab Resumen
1. Fichas por vista: Global, 1v1, 2v2, 3v3, Clásicos.
2. Cada ficha: Series ganadas/perdidas, PJ/G/P, forma reciente.
3. Contenido compacto y expandible.

### Tab Partidos
1. Lista cronológica, densa, filtrable.
2. Filtros visibles con chips removibles.
3. Orden por fecha de juego, no fecha de carga.
4. Ediciones con ícono warning + tooltip/auditoría.

## 10) Borrado y edición (seguridad + UX)
1. Borrar partido individual desde detalle.
2. Borrar serie completa desde encabezado de serie.
3. Confirmación en 2 pasos para acciones destructivas.
4. Soft delete obligatorio (`isDeleted`, `deletedAt`, `deletedBy`) para recupero/auditoría.
5. Superadmin conserva `Borrar todo`.

## 11) FallBacks y resiliencia
1. Sin sesión activa: redirigir a selector/login.
2. Usuario eliminado en backend: logout forzado limpio.
3. Sin conexión: modo offline con cola local y sincronización al reconectar.
4. Conflictos de sincronización: priorizar historial más largo y merges por acción.
5. Errores de guardado: no perder score en pantalla, mostrar retry.
6. Cache PWA viejo: banner `Nueva versión disponible` con reload.

## 12) Guardrails de UX
1. Siempre posibilidad de volver atrás en setup (cantidad -> selección -> equipos).
2. No permitir iniciar partido con equipos incompletos.
3. En 1v1 no mostrar campos de pareja/equipo innecesarios.
4. Fechas siempre en formato `DD/MM/AA` en UI y selector nativo en input.

## 13) Telemetría mínima sugerida
1. `match_started`.
2. `match_finished`.
3. `direct_scorer_saved`.
4. `direct_scorer_discarded`.
5. `result_edited`.
6. `match_deleted`.
7. `series_created`.

## 14) Roadmap de implementación sugerido
1. Sprint A: cerrar bug de anotador directo + modal de decisiones.
2. Sprint B: borrado partido/serie con soft delete y permisos.
3. Sprint C: endurecer offline/sync + banner de update PWA.
4. Sprint D: pulido final de estadísticas y filtros avanzados.

## 15) Definiciones cerradas
1. En anotador directo, `Guardar resultado actual` no pide fecha/sede.
2. Borrado permitido solo para creador del registro o admin.
3. Soft delete obligatorio en esta versión.
4. Pica pica activo solo en 3v3.
