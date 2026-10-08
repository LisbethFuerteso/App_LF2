import type { Plan } from './lib/reportes-rutapro';
import { cargarPoligonos } from './lib/geometria-rutapro';
import { prepararHeatmap } from './lib/heatmap-leaflet';
import { paletaIncendio } from './lib/paleta-incendio';
import {
  UMBRAL_INCENDIO, emojisPrioridad, pesoPrioridad, prioridadActiva,
} from './lib/reglas-clima';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Geometry, Polygon, MultiPolygon } from 'geojson';
import type { DatosRutaPRO } from './lib/rutapro';
import type { FilaClima } from './lib/clima-rutapro';
import { RutaPRODataError } from './lib/rutapro';
import { cargarGeometriasClima, llaveSuerte } from './lib/geometria-clima';
import {
  asignarAlces, colorGD, colorTransitabilidad,
  emojiMadurante, MADURANTES_VERDE, MADURANTES_ROJO,
} from './lib/reglas-clima';

type Fila = ReturnType<typeof asignarAlces<FilaClima>>[number];
type Props = {
  datos: DatosRutaPRO;
  filas: Fila[];
  frentesActivos: string[];
  plan: Plan;
};
const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

function popup(r: Fila) {
  const root = document.createElement('div');
  const values: [string, unknown][] = [
    ['Nombre', r.nombre], ['Suerte', r.suerte], ['Hacienda', r.hacienda],
    ['Zona', r.zona], ['Tenencia', r.tenencia], ['Corte', r.corte],
    ['Edad', r.edad], ['TMin últimos 30 días', r.tminUltimos30],
    ['GD hasta hoy', r.gdHastaHoy], ['Prioridad', r.prioridad],
    ['Transitabilidad', r.transitabilidad], ['Madurante', r.madurante],
    ['SDAM', r.sdam], ['Mes Cosecha', r.mesCosecha],
    ['Ton predichas', r.tonPred], ['Sacarosa pred', r.sacarosaPred],
    ['Sacarosa pred sin', r.sacarosaPredSin],
    ['Prob. Incendio', r.probabilidadIncendio],
    ['🚛 Alce más cercano', r.Alce_cercano], ['📏 Distancia (km)', r.Dist_Alce_km],
  ];
  for (const [name, value] of values) {
    const line = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = name + ': ';
    line.append(label, document.createTextNode(value == null ? '—'
      : typeof value === 'number' ? numero.format(value) : String(value)));
    root.append(line);
  }
  return root;
}

// Centroide plano del polígono de mayor área, incluyendo sus huecos.
// Reproduce la elección of_largest_polygon usada para los emojis en R.
function centroideMayor(geometry: Polygon | MultiPolygon): L.LatLngTuple | null {
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates] : geometry.coordinates;

  function centroideAnillo(ring: number[][]) {
    let dobleArea = 0, x = 0, y = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const cruz = a[0] * b[1] - b[0] * a[1];
      dobleArea += cruz;
      x += (a[0] + b[0]) * cruz;
      y += (a[1] + b[1]) * cruz;
    }
    if (!dobleArea) return null;
    return { area: Math.abs(dobleArea / 2),
      x: x / (3 * dobleArea), y: y / (3 * dobleArea) };
  }

  let mayor: { area: number; x: number; y: number } | null = null;
  for (const rings of polygons) {
    let area = 0, x = 0, y = 0;
    rings.forEach((ring, i) => {
      const c = centroideAnillo(ring);
      if (!c) return;
      const peso = i === 0 ? c.area : -c.area;
      area += peso;
      x += c.x * peso;
      y += c.y * peso;
    });
    if (area > 0 && (!mayor || area > mayor.area))
      mayor = { area, x: x / area, y: y / area };
  }
  return mayor ? [mayor.y, mayor.x] : null;
}

function emoji(centro: L.LatLngTuple, texto: string, size: number) {
  const element = document.createElement('span');
  element.textContent = texto;
  Object.assign(element.style, {
    fontSize: size + 'px', lineHeight: '1',
    textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
  });
  return L.marker(centro, {
    interactive: false,
    icon: L.divIcon({
      html: element, className: 'rutapro-icono-mapa',
      iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    }),
  });
}

function leyenda(
  map: L.Map, position: L.ControlPosition,
  titulo: string, filas: [string | null, string][],
) {
  const control = new L.Control({ position });
  control.onAdd = () => {
    const root = document.createElement('div');
    Object.assign(root.style, {
      background: 'white', padding: '8px 12px', borderRadius: '6px',
      border: '1px solid #ccc', fontSize: '12px', lineHeight: '2',
      color: '#222', fontFamily: 'Segoe UI, sans-serif',
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    });
    const title = document.createElement('strong');
    title.textContent = titulo;
    root.append(title);
    for (const [color, text] of filas) {
      const line = document.createElement('div');
      if (color) {
        const swatch = document.createElement('span');
        Object.assign(swatch.style, {
          background: color, width: '13px', height: '13px',
          display: 'inline-block', marginRight: '6px', borderRadius: '2px',
        });
        line.append(swatch);
      }
      line.append(document.createTextNode(text));
      root.append(line);
    }
    L.DomEvent.disableClickPropagation(root);
    L.DomEvent.disableScrollPropagation(root);
    return root;
  };
  control.addTo(map);
}

export default function MapaClimatico({ datos, filas, frentesActivos, plan }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [lectura, setLectura] = useState<{
    datos: DatosRutaPRO; geometries: Map<string, Geometry>; programa: Map<string, Geometry>; error: string;
  } | null>(null);

  const [heatReady, setHeatReady] = useState(false);
  const [errorHeat, setErrorHeat] = useState('');
  useEffect(() => {
    let active = true;
    prepararHeatmap().then(() => {
      if (active) setHeatReady(true);
    }).catch(cause => {
      if (active) setErrorHeat(cause instanceof Error
        ? cause.message : 'No se pudo iniciar el mapa de calor.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      cargarGeometriasClima(datos), cargarPoligonos(datos),
    ]).then(([geometries, programa]) => {
      if (active) setLectura({ datos, geometries, programa, error: '' });
    }).catch(cause => {
      if (active) setLectura({
        datos, geometries: new Map(), programa: new Map(),
        error: cause instanceof RutaPRODataError ? cause.message
          : 'No se pudo leer la geometría climática.',
      });
    });
    return () => { active = false; };
  }, [datos]);

  useEffect(() => {
    if (!container.current || !heatReady || lectura?.datos !== datos || lectura.error) return;
    const map = L.map(container.current, { preferCanvas: true });
    const claro = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);
    const satelite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri — Source: Esri and imagery providers', maxZoom: 19,
      });
    const gd = L.featureGroup();
    const maduradas = L.featureGroup();
    const transito = L.featureGroup();
    const alces = L.featureGroup().addTo(map);
    const bounds = L.latLngBounds([]);

    for (const r of filas) {
      const geometry = lectura.geometries.get(llaveSuerte(r.hacienda, r.suerte));
      if (!geometry) continue;
      const polygon = geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';

      function capa(
        color: string, borde: string, peso: number, opacidad: number,
      ) {
        const layer = polygon ? L.geoJSON(geometry, {
          style: { color: borde, weight: peso, fillColor: color, fillOpacity: opacidad },
        }) : L.circleMarker([r.latC!, r.lngC!], {
          radius: 12, color: borde, weight: 1.5,
          fillColor: color, fillOpacity: 0.85,
        });
        layer.bindPopup(popup(r));
        if (polygon) {
          const label = document.createElement('span');
          label.textContent = (r.nombre ?? '') + ' - S' + (r.suerte ?? '');
          layer.bindTooltip(label);
        }
        return layer;
      }

      capa(colorGD(r.gdHastaHoy), '#2c3e50', 0.6, 0.65).addTo(gd);
      const trans = capa(colorTransitabilidad(r.transitabilidad), '#34495e', 0.7, 0.72);
      trans.addTo(transito);

      if (r.madurante &&
          [...MADURANTES_VERDE, ...MADURANTES_ROJO].includes(r.madurante)) {
        capa(MADURANTES_VERDE.includes(r.madurante) ? '#6b8e23' : '#c0392b',
          '#2c3e50', 0.8, 0.75).addTo(maduradas);
        const texto = emojiMadurante(r.madurante, r.sdam);
        const centro = polygon
          ? centroideMayor(geometry as Polygon | MultiPolygon)
          : [r.latC!, r.lngC!] as L.LatLngTuple;
        if (texto && centro) emoji(centro, texto, 26).addTo(maduradas);
      }
      bounds.extend([r.latC!, r.lngC!]);
    }


    const incendios = L.featureGroup();
    const activas = L.featureGroup();
    const conIncendio = filas.filter(r =>
      typeof r.probabilidadIncendio === 'number' &&
      r.probabilidadIncendio > UMBRAL_INCENDIO);
    const colorIncendio = paletaIncendio(
      conIncendio.map(r => r.probabilidadIncendio!)
    );

    for (const r of conIncendio) {
      const geometry = lectura.geometries.get(llaveSuerte(r.hacienda, r.suerte));
      if (!geometry) continue;
      const polygon = geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
      const layer = polygon ? L.geoJSON(geometry, {
        style: {
          color: '#7f1d1d', weight: 0.8,
          fillColor: colorIncendio(r.probabilidadIncendio!), fillOpacity: 0.75,
        },
      }) : L.circleMarker([r.latC!, r.lngC!], {
        radius: 12, color: '#7f1d1d', weight: 1.5,
        fillColor: colorIncendio(r.probabilidadIncendio!), fillOpacity: 0.85,
      });
      layer.bindPopup(popup(r)).addTo(incendios);
    }

    const puntosCalor: [number, number, number][] = [];
    for (const r of plan) {
      const peso = pesoPrioridad(r);
      if (peso > 0 && Number.isFinite(r.lat) && Number.isFinite(r.lng))
        puntosCalor.push([r.lat!, r.lng!, peso]);

      if (!prioridadActiva(r)) continue;
      const geometry = lectura.programa.get(llaveSuerte(r.hacienda, r.suerte));
      // El R dibuja esta capa únicamente cuando existe un polígono.
      if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon'))
        continue;

      const p = r.prioridad ?? '';
      const color = /Urgente|Robo de caña|Incendio con alta degradación|Óptimo de vejez/i.test(p)
        ? '#c0392b' : /Intermedi/i.test(p) ? '#f1c40f'
        : /Óptimo/i.test(p) ? '#6b8e23'
        : /Sin prioridad/i.test(p) ? '#f5f5dc' : '#bdc3c7';
      const content = document.createElement('div');
      for (const [label, value] of [
        ['Nombre', r.nombre], ['Suerte', r.suerte],
        ['Prioridad', r.prioridad], ['Ton', r.tonPred],
      ]) {
        const line = document.createElement('div');
        line.textContent = String(label) + ': ' + String(value ?? '—');
        content.append(line);
      }
      L.geoJSON(geometry, {
        style: { color: '#2c3e50', weight: 0.8, fillColor: color, fillOpacity: 0.7 },
      }).bindPopup(content).addTo(activas);

      const centro = centroideMayor(geometry);
      const texto = emojisPrioridad(r);
      if (centro && texto) emoji(centro, texto, 30).addTo(activas);
    }
    const calor = L.heatLayer(puntosCalor, { blur: 25, max: 0.05, radius: 18 });

    for (const f of datos.df_entrada_frentes) {
      if (f.alce && frentesActivos.includes(f.alce) &&
          Number.isFinite(f.lat) && Number.isFinite(f.lng)) {
        emoji([f.lat!, f.lng!], '🚛', 36).addTo(alces);
      }
    }

    // Las capas climáticas empiezan desactivadas, como hideGroup en R.
    L.control.layers({ Claro: claro, 'Satélite': satelite }, {
      'GD hasta hoy': gd,
      'Probabilidad Incendio': incendios,
      'Cañas maduradas': maduradas,
      'Transitabilidad': transito,
      'Prioridades activas': activas,
      'Heatmap prioridades': calor,
      'Alces': alces,
    }, { collapsed: false }).addTo(map);

    leyenda(map, 'bottomleft', 'Prioridades activas', [
      [null, '🦹 Robo · 🚒 Vejez · 🧯 Incendio degrad. · 📜 Compromiso · 🔥 Prob.>20'],
    ]);
    leyenda(map, 'bottomright', 'Transitabilidad', [
      ['#1565C0', 'Alta'], ['#2E7D32', 'Media alta'],
      ['#F9A825', 'Media baja'], ['#B71C1C', 'No transitable'],
      ['#9E9E9E', 'Sin info'],
    ]);
    leyenda(map, 'topleft', 'Cañas maduradas', [
      ['#6b8e23', 'BONUS / OPTIMUS'], ['#c0392b', 'FUSILADE'],
      [null, '🚨 FUSILADE (alerta quema)'],
      [null, '❗ BONUS/OPTIMUS + SDAM > 12'],
      [null, '🟢 BONUS/OPTIMUS + SDAM 8–12'],
    ]);

    if (bounds.isValid()) map.fitBounds(bounds, { padding: [25, 25], maxZoom: 16 });
    else map.setView([3.25, -76.4], 10);
    const observer = new ResizeObserver(() => {
      if (container.current?.offsetWidth) map.invalidateSize({ pan: false });
    });
    observer.observe(container.current);
    return () => { observer.disconnect(); map.remove(); };
  }, [lectura, datos, filas, frentesActivos, plan, heatReady]);

  if (errorHeat) return <p role="alert" className="text-destructive">{errorHeat}</p>;
  if (!heatReady) return <p role="status">Preparando mapa de calor…</p>;
  if (lectura?.datos !== datos)
    return <p role="status">Leyendo y comprobando geometrías climáticas…</p>;
  if (lectura.error)
    return <p role="alert" className="text-destructive">{lectura.error}</p>;
  return <div ref={container}
    aria-label="Mapa climático"
    style={{ width: '100%', height: 650, isolation: 'isolate' }} />;
}
