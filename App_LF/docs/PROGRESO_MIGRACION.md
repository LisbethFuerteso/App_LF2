# Estado de la migración RutaPRO — 2026-10-08

Estado: aplicación en modo validación. No habilitada para decisiones operativas.

Implementado:
- Conexión con Fabric y validación del contrato y lote de publicación.
- Cálculo de bloques, traslados, mapas, vías y monitoreo climático.
- Tablas completas, filtros, paginación, Copiar, CSV y Excel.
- Gráfico de toneladas por bloque.
- Comentarios, árbol de decisión, manual, presets, historial y comparación A/B.
- PDF consolidado y ZIP por grupo; páginas como imágenes.
- Resumen agrupado por Grupo, Tipo_Grupo y Alce según el R.
- Alertas, sugerencias de calibración y variaciones entre planes.
- Diagnóstico de los controles de calidad de la publicación.

Validación:
- TypeScript, lint, 107 pruebas y compilación aprobados.
- Interfaz anterior confirmada visualmente por la usuaria.
- Últimas alertas y diagnóstico: comprobación en navegador pendiente.

Lakehouse:
- Conservadas 14 tablas de publicación RutaPRO.
- Retiradas 16 tablas mediante respaldo y verificación de contenido.
- Respaldo: Files/rutapro_respaldos/20261008T190442Z_7748d6fc-d134-4ec4-830d-c002c582522c
- Usar Publicar_Backend_RutaPRO_Reducido.py para próximas publicaciones.
- La limpieza fue puntual; no forma parte de la actualización habitual.

Pendientes:
- Comparación numérica con los Excel de R, aplazada por falta de archivos.
- Resolver los controles de calidad y la vigencia de fuentes antes del modo operativo.
- Completar la revisión final de equivalencia funcional contra app_v2 2.R.
- Confirmar el despliegue y probar las últimas alertas y el diagnóstico.
- Guardar los últimos cambios en GitHub.

Proyecto: /workspaces/App_LF2/App_LF
App: https://tawny-echo-4680e577bc-eastus2.webapp.fabricapps.net


<!-- cierre-rutapro-20261008 -->
## Cierre de revisión — 2026-10-08

Revisión estática de los módulos revisados terminada para validación; alcance, evidencia y limitaciones en [REVISION_FUNCIONAL_RUTAPRO.md](REVISION_FUNCIONAL_RUTAPRO.md).
La última ejecución compartida aprobó typecheck, lint, 107 pruebas en 17 archivos y build.
Panel de alertas, controles de calidad y fecha de corte confirmados visualmente.
IC92 queda pendiente de interpretación; también quedan comparación con Excel del R, actualización de fuentes y resolución de observaciones de calidad.
Se mantiene perfil validacion, backend completo No y apto operativo No.
Este apartado actualiza el estado de revisión; los apartados anteriores conservan el historial.
El guardado en Git se confirma únicamente con el commit y push posteriores.
