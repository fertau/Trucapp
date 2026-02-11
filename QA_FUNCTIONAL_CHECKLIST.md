# QA Funcional - Trucapp

## Acceso y sesión
- Login con PIN correcto.
- Login con PIN incorrecto.
- Logout y login inmediato.
- Sesión huérfana (usuario borrado): debe redirigir a login.

## Flujo partido
- Crear 1v1, 2v2, 3v3.
- Finalizar partido normal.
- Finalizar manual con score custom.
- Validar que no se duplica el partido en historial.
- Validar que la pantalla de victoria permite salir correctamente.

## Historial y edición
- Abrir detalle de partido desde historial.
- Editar solo metadata (sede/fecha): no mostrar warning de resultado.
- Editar score/ganador: mostrar warning ⚠.
- Intentar guardar score/ganador inconsistente: bloquear guardado.
- Filtros combinados (modo, resultado, rival, texto).
- Paginación: "Cargar mas" trae más partidos sin duplicados.

## Seguridad/roles
- Verificar superadmin solo por `VITE_SUPERADMIN_USER_ID`.
- Confirmar que usuarios no-superadmin no ven "Zona de Peligro".

## Mobile UX (iOS)
- Safe areas (header, navbar, drawers).
- Tap targets en tabs/chips/botones.
- Navbar fija clara y separada del contenido.
