import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DatosRutaPRO } from './lib/rutapro';
import { RutaPRODataError } from './lib/rutapro';
import type { calcularPlan } from './lib/plan-cosecha';
import { cargarPoligonos, llaveSuerte, type Poligonos } from './lib/geometria-rutapro';

type Plan = ReturnType<typeof calcularPlan<DatosRutaPRO['df_programa'][number]>>;
type Props = { datos: DatosRutaPRO; plan: Plan };
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
export default function MapaCosecha({ datos, plan }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [poligonos, setPoligonos] = useState<Poligonos>();
  const [error, setError] = useState('');
  const [grupo, setGrupo] = useState('Todos');
  const [alce, setAlce] = useState('Todos');
  const [prioridad, setPrioridad] = useState('Todas');
  const asignadas = useMemo(() => plan.filter(r => r.Grupo !== null), [plan]);
  const grupos = useMemo(() =>
    [...new Set(asignadas.map(r => r.Grupo!))].sort((a, b) => a - b), [asignadas]);
  const alces = useMemo(() =>
    [...new Set(asignadas.flatMap(r => r.Alce ? [r.Alce] : []))].sort(), [asignadas]);
  const prioridades = useMemo(() =>
    [...new Set(asignadas.flatMap(r => r.prioridad ? [r.prioridad] : []))].sort(), [asignadas]);
  const visibles = useMemo(() => asignadas.filter(r =>
    (grupo === 'Todos' || String(r.Grupo) === grupo) &&
    (alce === 'Todos' || r.Alce === alce) &&
    (prioridad === 'Todas' || r.prioridad === prioridad)),
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

    for (const row of visibles) {
      const geometry = poligonos.get(llaveSuerte(row.hacienda, row.suerte));
      const color = colorPrioridad(row.prioridad);
      const layer = geometry ? L.geoJSON(geometry, {
        style: { color: '#555555', weight: 1, fillColor: color, fillOpacity: 0.7 },
      }) : L.circleMarker([row.lat!, row.lng!], {
        radius: 5, color: '#555555', fillColor: color, fillOpacity: 0.8,
      });
      layer.bindPopup(popup([
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
      const rows = asignadas.filter(r => r.Grupo === g);
      const lat = rows.reduce((s, r) => s + r.lat!, 0) / rows.length;
      const lng = rows.reduce((s, r) => s + r.lng!, 0) / rows.length;
      const color = coloresGrupo[(g - 1) % coloresGrupo.length];
      L.circleMarker([lat, lng], { radius: 9, color, fillColor: color, fillOpacity: 1 })
        .bindTooltip('Grupo ' + g)
        .bindPopup(popup([['Grupo', g], ['Tipo', rows[0].Tipo_Grupo], ['Alce', rows[0].Alce]]))
        .addTo(centroides);
    }
    const activos = new Set(visibles.map(r => r.Alce));
    for (const f of datos.df_entrada_frentes.filter(f => f.alce && activos.has(f.alce))) {
      if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
      L.circleMarker([f.lat!, f.lng!], {
        radius: 7, color: '#0C25A3', fillColor: '#FDC300', fillOpacity: 1,
      }).bindTooltip('🚛 ' + f.alce)
        .bindPopup(popup([['Frente', f.alce]])).addTo(frentes);
    }
    L.control.layers({ Claro: claro, 'Satélite': satelite },
      { Suertes: suertes, 'Centroides de grupos': centroides, Frentes: frentes }).addTo(map);
    L.control.scale({ imperial: false }).addTo(map);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [25, 25], maxZoom: 16 });
    else map.setView([3.25, -76.4], 10);
    return () => { map.remove(); };
  }, [poligonos, visibles, asignadas, datos]);

  const sinPoligono = poligonos
    ? visibles.filter(r => !poligonos.has(llaveSuerte(r.hacienda, r.suerte))).length : 0;
  return (
    <section className="space-y-400" aria-label="Mapa del plan de cosecha">
      <h3 className="font-heading text-500">🗺️ Mapa</h3>
      <div className="flex flex-wrap gap-400">
        {[
          ['Grupos', grupo, setGrupo, ['Todos', ...grupos.map(String)]],
          ['Alce (frente)', alce, setAlce, ['Todos', ...alces]],
          ['Prioridad', prioridad, setPrioridad, ['Todas', ...prioridades]],
        ].map(([label, value, setter, options]) => (
          <label key={String(label)} className="text-300">
            {String(label)}
            <select className="ml-200 rounded-lg border p-200"
              value={String(value)}
              onChange={e => (setter as (v: string) => void)(e.target.value)}>
              {(options as string[]).map(option =>
                <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        ))}
      </div>
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
    </section>
  );
}
