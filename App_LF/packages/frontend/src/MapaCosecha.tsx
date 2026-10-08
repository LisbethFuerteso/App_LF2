import ComentarioSuerte from './ComentarioSuerte';
import { leerComentario } from './lib/comentarios-rutapro';
import { cargarVias, type Via } from './lib/vias-rutapro';
import FiltroMapa from './FiltroMapa';
import type { FiltrosMapa } from './lib/reportes-rutapro';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DatosRutaPRO } from './lib/rutapro';
import { RutaPRODataError } from './lib/rutapro';
import type { calcularPlan } from './lib/plan-cosecha';
import { cargarPoligonos, llaveSuerte, type Poligonos } from './lib/geometria-rutapro';

type Plan = ReturnType<typeof calcularPlan<DatosRutaPRO['df_programa'][number]>>;
type Props = { datos: DatosRutaPRO; plan: Plan; filtros: FiltrosMapa; frentesActivos: string[]; onFiltros: (f: FiltrosMapa) => void };
const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const coloresGrupo = [
  '#e6194B', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#42d4f4', '#f032e6', '#469990', '#9a6324', '#800000',
  '#808000', '#000075', '#1abc9c', '#d35400', '#34495e',
  '#16a085', '#8e44ad', '#c0392b', '#27ae60', '#7f8c8d',
];
function colorPrioridad(p?: string | null) {
  if (!p) return '#bdc3c7';
  if (/Urgente|Robo de caña|Incendio con alta degradación|Óptimo de vejez/i.test(p))
    return '#c0392b';
  if (/Intermedi/i.test(p)) return '#f1c40f';
  if (/Óptimo/i.test(p)) return '#6b8e23';
  if (/Sin prioridad/i.test(p)) return '#f5f5dc';
  return '#bdc3c7';
}
function popup(values: [string, unknown][]) {
  const root = document.createElement('div');
  for (const [label, value] of values) {
    const line = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = label + ': ';
    line.append(name, document.createTextNode(value == null ? 'Sin dato' :
      typeof value === 'number' ? numero.format(value) : String(value)));
    root.append(line);
  }
  return root;
}
export default function MapaCosecha({ datos, plan, filtros, frentesActivos, onFiltros }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [poligonos, setPoligonos] = useState<Poligonos>();
  const [error, setError] = useState('');
  const [comentando, setComentando] = useState<Plan[number] | null>(null);
  const [avisoComentario, setAvisoComentario] = useState('');
  const versionesComentario = useRef(new Map<string, number>());
  const popupComentario = useRef<{
    llave: string; element: HTMLDivElement;
  } | null>(null);
  const [lecturaVias, setLecturaVias] = useState<{
    datos: DatosRutaPRO; vias: Via[]; error: string;
  } | null>(null);
  const vias = useMemo(
    () => lecturaVias?.datos === datos ? lecturaVias.vias : [],
    [lecturaVias, datos],
  );
  const errorVias = lecturaVias?.datos === datos ? lecturaVias.error : '';

  useEffect(() => {
    let active = true;
    cargarVias(datos).then(result => {
      if (active) setLecturaVias({ datos, vias: result, error: '' });
    }).catch(cause => {
      if (active) setLecturaVias({
        datos, vias: [],
        error: cause instanceof RutaPRODataError
          ? cause.message
          : 'No se pudieron leer las vías. Revisar sesión, permisos y conector.',
      });
    });
    return () => { active = false; };
  }, [datos]);

  const { grupo, alce, prioridad } = filtros;
  const setGrupo = (grupo: string[]) => onFiltros({ ...filtros, grupo });
  const setAlce = (alce: string[]) => onFiltros({ ...filtros, alce });
  const setPrioridad = (prioridad: string[]) => onFiltros({ ...filtros, prioridad });
  const asignadas = useMemo(() => plan.filter(r => r.Grupo !== null), [plan]);
  const grupos = useMemo(() =>
    [...new Set(asignadas.map(r => r.Grupo!))].sort((a, b) => a - b), [asignadas]);
  const alces = useMemo(() =>
    [...new Set(asignadas.flatMap(r => r.Alce ? [r.Alce] : []))].sort(), [asignadas]);
  const prioridades = useMemo(() =>
    [...new Set(asignadas.flatMap(r => r.prioridad ? [r.prioridad] : []))].sort(), [asignadas]);
  const visibles = useMemo(() => asignadas.filter(r =>
    (!grupo.length || grupo.includes(String(r.Grupo))) &&
    (!alce.length || alce.includes('Todos') || alce.includes(r.Alce ?? '')) &&
    (!prioridad.length || prioridad.includes('Todas') || prioridad.includes(r.prioridad ?? ''))),
    [asignadas, grupo, alce, prioridad]);

  useEffect(() => {
    let active = true;
    cargarPoligonos(datos).then(result => {
      if (active) setPoligonos(result);
    }).catch(cause => {
      if (active) setError(cause instanceof RutaPRODataError ? cause.message :
        'No se pudieron leer los polígonos. Revisar sesión, permisos y conector.');
    });
    return () => { active = false; };
  }, [datos]);

  useEffect(() => {
    if (!container.current || !poligonos) return;
    const map = L.map(container.current, { preferCanvas: true });
    const claro = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 });
    const satelite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri — Source: Esri and imagery providers', maxZoom: 19 });
    claro.addTo(map);
    const suertes = L.featureGroup().addTo(map);
    const centroides = L.featureGroup().addTo(map);
    const frentes = L.featureGroup().addTo(map);
    const bounds = L.latLngBounds([]);

    function popupSuerte(row: Plan[number], campos: [string, unknown][]) {
      const root = popup(campos);
      const llave = llaveSuerte(row.hacienda, row.suerte);
      const version = versionesComentario.current.get(llave) ?? 0;
      const texto = document.createElement('div');
      texto.style.whiteSpace = 'pre-wrap';
      texto.style.fontStyle = 'italic';
      texto.style.marginBlock = '8px';
      texto.textContent = 'Leyendo comentario…';
      popupComentario.current = { llave, element: texto };

      const editar = document.createElement('button');
      editar.type = 'button';
      editar.textContent = '📝 Editar comentario';
      editar.addEventListener('click', () => setComentando(row));
      root.append(texto, editar);

      leerComentario(row.hacienda, row.suerte).then(contenido => {
        if ((versionesComentario.current.get(llave) ?? 0) === version)
          texto.textContent = contenido || 'Sin comentarios.';
      }).catch(() => {
        if ((versionesComentario.current.get(llave) ?? 0) === version)
          texto.textContent = 'No se pudo leer el comentario.';
      });
      return root;
    }

    for (const row of visibles) {
      const geometry = poligonos.get(llaveSuerte(row.hacienda, row.suerte));
      const color = colorPrioridad(row.prioridad);
      const layer = geometry ? L.geoJSON(geometry, {
        style: { color: '#2c3e50', weight: 0.8, fillColor: color, fillOpacity: 0.55 },
      }) : L.circleMarker([row.lat!, row.lng!], {
        radius: 5, color: '#555555', fillColor: color, fillOpacity: 0.8,
      });
      if (geometry) {
        const label = document.createElement('span');
        label.textContent = (row.nombre ?? '') + ' - S' + (row.suerte ?? '');
        layer.bindTooltip(label);
        layer.on('mouseover', () => layer.setStyle({
          weight: 2.5, color: '#000', fillOpacity: 0.8,
        }));
        layer.on('mouseout', () => layer.setStyle({
          weight: 0.8, color: '#2c3e50', fillOpacity: 0.55,
        }));
      }
      layer.bindPopup(() => popupSuerte(row, [
        ['Nombre', row.nombre], ['Hacienda', row.hacienda], ['Suerte', row.suerte],
        ['Grupo', row.Grupo], ['Tipo', row.Tipo_Grupo], ['Orden de cosecha', row.Orden_Cosecha],
        ['Alce', row.Alce], ['Toneladas predichas', row.tonPred],
        ['Edad', row.edad], ['Prioridad', row.prioridad],
        ['Transitabilidad', row.transitabilidad],
        ['Representación', geometry ? 'Polígono' : 'Punto: polígono no disponible'],
      ]));
      suertes.addLayer(layer);
      if ('getBounds' in layer) bounds.extend(layer.getBounds());
      else bounds.extend([row.lat!, row.lng!]);
    }
    for (const g of [...new Set(visibles.map(r => r.Grupo!))]) {
      const rows = visibles.filter(r => r.Grupo === g);
      const lat = rows.reduce((s, r) => s + r.lat!, 0) / rows.length;
      const lng = rows.reduce((s, r) => s + r.lng!, 0) / rows.length;
      const color = coloresGrupo[(g - 1) % coloresGrupo.length];
      L.circleMarker([lat, lng], { radius: 14, color: '#FFFFFF', weight: 3, fillColor: color, fillOpacity: 0.92 })
        .bindTooltip('Grupo ' + g)
        .bindPopup(popup([['Grupo', g], ['Tipo', rows[0].Tipo_Grupo], ['Alce', rows[0].Alce]]))
        .addTo(centroides);
    }

    // Los frentes activos corresponden a la selección del usuario,
    // incluso cuando todavía no tienen un bloque asignado.
    const activos = new Set(frentesActivos);
    const inactivos = L.featureGroup().addTo(map);
    const fabrica = L.featureGroup().addTo(map);

    function iconoEmoji(emoji: string, size: number, apagado = false) {
      const element = document.createElement('span');
      element.textContent = emoji;
      element.style.fontSize = size + 'px';
      element.style.lineHeight = '1';
      element.style.textShadow = '2px 2px 4px rgba(0,0,0,0.7)';
      if (apagado) {
        element.style.opacity = '0.45';
        element.style.filter = 'grayscale(100%)';
      }
      return L.divIcon({
        html: element, className: 'rutapro-icono-mapa',
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });
    }

    for (const f of datos.df_entrada_frentes) {
      if (!f.alce || !Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
      const activo = activos.has(f.alce);
      L.marker([f.lat!, f.lng!], {
        icon: iconoEmoji('🚛', activo ? 40 : 36, !activo),
      }).bindTooltip('🚛 ' + f.alce)
        .bindPopup(popup([
          ['Estado', activo ? '🚛 Frente Activo' : '🚛 Frente Inactivo'],
          ['Alce', f.alce], ['Latitud', f.lat], ['Longitud', f.lng],
        ])).addTo(activo ? frentes : inactivos);
    }

    L.marker([3.2776725515801566, -76.31826330732822], {
      icon: iconoEmoji('🏭', 48),
    }).bindTooltip('🏭 INCAUCA S.A.S').addTo(fabrica);


    const internas = L.featureGroup();
    const principales = L.featureGroup();
    for (const via of vias) {
      const esInterna = via.origen === 'Internas';
      L.geoJSON(via.geometry, {
        style: {
          color: esInterna ? '#7f8c8d' : '#2c3e50',
          weight: esInterna ? 1.5 : 2.5,
          opacity: esInterna ? 0.7 : 0.9,
        },
      }).addTo(esInterna ? internas : principales);
    }
    if (vias.length) {
      internas.addTo(map);
      principales.addTo(map);
    }
    const overlays: Record<string, L.Layer> = {
      'Fábrica': fabrica,
      'Frentes activos': frentes,
      'Frentes inactivos': inactivos,
      'Campos': suertes,
      ...(vias.length ? { 'Vías Internas': internas, 'Vías Principales': principales } : {}),
      'Centroides de grupos': centroides,
    };

    for (const g of [...new Set(visibles.map(r => r.Grupo!))].sort((a, b) => a - b)) {
      const rows = visibles.filter(r => r.Grupo === g)
        .sort((a, b) => a.Orden_Cosecha! - b.Orden_Cosecha!);
      const capa = L.featureGroup().addTo(map);
      const color = coloresGrupo[(g - 1) % coloresGrupo.length];
      const nombre = 'Grupo ' + g + ' (' + rows[0].Tipo_Grupo + ')';
      overlays[nombre] = capa;

      if (rows.length >= 2) {
        L.polyline(rows.map(r => [r.lat!, r.lng!] as L.LatLngTuple), {
          color, weight: 3, opacity: 0.85, dashArray: '6,6',
        }).bindTooltip('Ruta ' + nombre).addTo(capa);
      }

      for (const r of rows) {
        L.circleMarker([r.lat!, r.lng!], {
          radius: 9, color: '#2c3e50', weight: 1.5,
          fillColor: color, fillOpacity: 0.9,
        }).bindPopup(() => popupSuerte(r, [
          ['Orden', r.Orden_Cosecha], ['Nombre', r.nombre],
          ['Hacienda', r.hacienda], ['Suerte', r.suerte],
          ['Grupo', r.Grupo], ['Tipo', r.Tipo_Grupo], ['Alce', r.Alce],
          ['Ton pred', r.tonPred], ['Prioridad', r.prioridad],
        ])).addTo(capa);

        const label = document.createElement('span');
        label.textContent = String(r.Orden_Cosecha ?? '');
        Object.assign(label.style, {
          color: 'white', fontWeight: 'bold', fontSize: '20px',
          textShadow: '2px 2px 3px rgba(0,0,0,0.9)',
        });
        L.marker([r.lat!, r.lng!], {
          interactive: false,
          icon: L.divIcon({
            html: label, className: 'rutapro-icono-mapa',
            iconSize: [30, 24], iconAnchor: [15, 12],
          }),
        }).addTo(capa);

        let emojis = '';
        if ((r.probabilidadIncendio ?? 0) > 20) emojis += '🔥';
        if (/Robo/i.test(r.prioridad ?? '')) emojis += '🦹';
        if (/Óptimo de vejez/i.test(r.prioridad ?? '')) emojis += '🚒';
        if (/Incendio con alta degradación/i.test(r.prioridad ?? '')) emojis += '🧯';
        if (/Compromiso comercial/i.test(r.prioridad ?? '')) emojis += '📜';

        if (emojis) {
          const icon = iconoEmoji(emojis, 32);
          icon.options.iconSize = [Math.max(32, Array.from(emojis).length * 32), 32];
          icon.options.iconAnchor = [16, 48];
          L.marker([r.lat!, r.lng!], {
            icon, interactive: false,
          }).addTo(capa);
        }
      }
    }

    L.control.layers({ Claro: claro, 'Satélite': satelite },
      overlays, { collapsed: false }).addTo(map);

    const leyendaR = new L.Control({ position: 'bottomright' });
    leyendaR.onAdd = () => {
      const root = document.createElement('div');
      Object.assign(root.style, {
        background: 'white', padding: '8px 12px', borderRadius: '6px',
        border: '1px solid #ccc', fontSize: '12px', lineHeight: '2',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)', color: '#222',
        fontFamily: '"Segoe UI", sans-serif',
      });
      const titulo = document.createElement('strong');
      titulo.textContent = 'Prioridad';
      root.append(titulo);
      for (const [color, texto] of [
        ['#c0392b', 'Urgente/Robo/Incendio/Vejez'],
        ['#f1c40f', 'Intermedia'],
        ['#6b8e23', 'Óptimo'],
        ['#f5f5dc', 'Sin prioridad'],
        ['#bdc3c7', 'Sin info'],
      ]) {
        const line = document.createElement('div');
        const swatch = document.createElement('span');
        Object.assign(swatch.style, {
          background: color, width: '13px', height: '13px',
          display: 'inline-block', marginRight: '6px',
          borderRadius: '2px', verticalAlign: 'middle',
          border: color === '#f5f5dc' ? '1px solid #ccc' : 'none',
        });
        line.append(swatch, document.createTextNode(texto));
        root.append(line);
      }
      L.DomEvent.disableClickPropagation(root);
      L.DomEvent.disableScrollPropagation(root);
      return root;
    };
    leyendaR.addTo(map);
    L.control.scale({ imperial: false }).addTo(map);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [25, 25], maxZoom: 16 });
    else map.setView([3.25, -76.4], 10);
    const observer = new ResizeObserver(() => {
      if (container.current?.offsetWidth && container.current.offsetHeight)
        map.invalidateSize({ pan: false });
    });
    observer.observe(container.current);
    return () => { observer.disconnect(); map.remove(); };
  }, [poligonos, visibles, asignadas, datos, frentesActivos, vias]);

  const sinPoligono = poligonos
    ? visibles.filter(r => !poligonos.has(llaveSuerte(r.hacienda, r.suerte))).length : 0;
  return (
    <section className="space-y-400" aria-label="Mapa del plan de cosecha">
      <h3 className="font-heading text-500">🗺️ Mapa</h3>

      <div className="flex flex-wrap gap-400">
        <FiltroMapa label="Grupos:" seleccion={grupo} onChange={setGrupo}
          opciones={grupos.map(g => ({
            value: String(g),
            label: 'Grupo ' + g + ' (' +
              asignadas.find(r => r.Grupo === g)?.Tipo_Grupo + ')',
          }))} />
        <FiltroMapa label="Alce (frente):" seleccion={alce} onChange={setAlce}
          opciones={['Todos', ...alces].map(value => ({ value, label: value }))} />
        <FiltroMapa label="Prioridad:" seleccion={prioridad} onChange={setPrioridad}
          opciones={['Todas', ...prioridades].map(value => ({ value, label: value }))} />
      </div>
      {errorVias && <p role="alert" className="text-destructive">{errorVias}</p>}
      {!poligonos && !error && <p role="status">Leyendo y comprobando polígonos…</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {poligonos && (
        <>
          <p className="text-300">
            {visibles.length} suertes visibles. {sinPoligono} sin polígono:
            se representan con las coordenadas existentes.
          </p>
          <div ref={container} style={{ height: 700, width: '100%', isolation: 'isolate' }} />
          <p className="text-300">
            Colores de prioridad del R: rojo = urgente / robo / incendio / vejez;
            amarillo = intermedio; verde oliva = óptimo; beige = sin prioridad;
            gris = sin clasificación. Los centroides identifican los grupos.
          </p>
        </>
      )}
      {avisoComentario && <p role="status">{avisoComentario}</p>}
      {comentando && (
        <ComentarioSuerte
          key={llaveSuerte(comentando.hacienda, comentando.suerte)}
          suerte={comentando}
          onCerrar={() => setComentando(null)}
          onGuardado={texto => {
            const llave = llaveSuerte(comentando.hacienda, comentando.suerte);
            versionesComentario.current.set(
              llave, (versionesComentario.current.get(llave) ?? 0) + 1,
            );
            const actual = popupComentario.current;
            if (actual?.llave === llave)
              actual.element.textContent = texto || 'Sin comentarios.';
            setAvisoComentario('✓ Comentario guardado');
            setComentando(null);
          }}
        />
      )}
    </section>
  );
}
