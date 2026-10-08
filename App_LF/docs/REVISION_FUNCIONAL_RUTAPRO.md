# Revisión funcional RutaPRO — 2026-10-08

Estado: cierre de revisión estática de los módulos revisados para el perfil de validación.
Referencia: app_v2 2.R y fuentes del frontend compartidas durante la migración.
Esta revisión no certifica igualdad numérica con una ejecución del R ni habilita uso operativo.

## Alcance revisado

| Módulo | Resultado de la revisión |
| --- | --- |
| Planificador | Semilla preferida, radio, proporción 70%, mínimo/objetivo/máximo, excepción de misma hacienda, urgentes primero y frente más cercano a la primera suerte. |
| Movimientos | Límite de tres importaciones por destino, validación del radio y recálculo del orden de origen y destino. |
| Resumen | Agrupación por Grupo, Tipo_Grupo y Alce; medias ponderadas excluyendo valores ausentes del denominador; porcentajes por Grupo; tiempos con constantes del R. |
| Alertas | Vejez <3 y >=3, compromiso, robo, arriendo Tenencia 28, Edad >14 y SDAM >14. Total combinado mediante unión, sin duplicar suertes y sin incorporar robo/arriendo como criterios adicionales. |
| Seguimiento | Variaciones al recalcular/cargar historial y sugerencias desde 40% de bloques débiles, con umbrales y límites del R. |
| Tablas y Excel | Resumen, programa con columnas del contrato y tabla climática; búsqueda, orden y paginación; exportación del conjunto filtrado, no solo la página. Totales conservan el conjunto recibido. |
| Mapa principal | Campos asignados, rutas y orden, frentes activos/inactivos, fábrica, vías, prioridades, emojis y comentarios por Hacienda/Suerte. |
| Clima | Umbrales, transitabilidad, madurantes, prioridad y asignación al frente más cercano; mapa climático e histograma SDAM integrados. |
| Herramientas | Comparador A/B, historial, presets, árbol de decisión, manual, reporte ejecutivo y PDF consolidado/ZIP por grupo integrados. |
| Publicación | Identificador de ejecución, contrato y controles de calidad; fecha de corte mostrada como fecha calendario. |

No se identificó una nueva corrección obligatoria en esta revisión de los módulos anteriores.
La comprobación automática del bloque de cierre solo verifica presencia de las integraciones; no reemplaza la revisión del código.

## Evidencia y límites

- Última ejecución aportada por la usuaria: typecheck y lint sin errores; 17 archivos y 107 pruebas aprobados; build completado.
- Interfaz, panel de alertas, controles y fecha 2026-10-08 confirmados en la salida visual compartida.
- Pruebas con casos sintéticos no demuestran equivalencia completa con los datos reales del R.
- PDF usa herramientas del navegador; no se certifica identidad visual con el PDF del R.
- Los mapas usan presentación y paletas propias. La reconstrucción puede restablecer zoom y selección de capas al cambiar filtros.
- Centroides de polígonos y gradientes de color implementados en JavaScript no tienen certificación de igualdad numérica con sf/Leaflet del R.
- El backend agrega controles de llaves, coordenadas, duplicados y procedencia; no inventa frentes ni ubicaciones para sustituir datos ausentes.

## Pendientes externos y de validación

1. Comparar programa, resumen, clima y reportes contra los Excel del R usando los mismos insumos, corte y parámetros. Incluir desempates y redondeos.
2. Confirmar significado de IC92: Hacienda 010002, Suerte 016, Lat 3.26007185465, Lng -76.3241852937. El R define IC01..IC15 y convierte IC92 a NA. El backend conserva el pendiente y excluye IC92 de frentes disponibles; mantiene la exclusión H/S del reporte de entrada. No se acordó un reemplazo.
3. Actualizar/verificar entrada (último DIA 2026-06-12) y clima (última observación informada 2026-09-13).
4. Revisar los 114 registros sin edad, conflictos de lluvia, llaves de eventos/riesgo/transitabilidad, riesgos de otros ciclos y presencia anual de robos. La imputación climatológica registrada no representa por sí sola un error.
5. Validar con referencias del R la precisión espacial y la presentación de exportaciones cuando estén disponibles. Las diferencias de interacción descritas arriba permanecen como limitaciones conocidas.

Perfil observado: validacion. Backend completo: No. Apto operativo: No.
580 suertes sin asignar en el plan mostrado no equivalen a 580 registros inválidos.
El indicador de cero registros inválidos del plan no elimina los pendientes separados por el backend.

## Publicación y mantenimiento

Lakehouse: 14 tablas de publicación conservadas; 16 tablas derivadas retiradas con respaldo verificado previamente.
Usar Publicar_Backend_RutaPRO_Reducido.py para la publicación rutinaria.
No volver a ejecutar la limpieza ni el parche inicial de interfaz para este cierre.
Conservar controles y pendientes hasta su resolución con evidencia.
El commit y el push deben confirmarse con la salida de Git del bloque de cierre.
