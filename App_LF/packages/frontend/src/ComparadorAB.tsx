import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SlotAB } from './lib/comparador-rutapro';
import {
  indicadoresAB, extraerIndicadores, deltaAB,
} from './lib/comparador-rutapro';
import { paletaComparador } from './lib/paleta-comparador';

function MapaSlot({ slot, nombre }: { slot?: SlotAB; nombre: string }) {
  const contenedor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = contenedor.current;
    if (!element) return;
    const mapa = L.map(element).setView([3.277, -76.318], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapa);

    const filas = slot?.plan.filter(r => r.Grupo !== null) ?? [];
    const color = paletaComparador(filas.flatMap(r =>
      r.Grupo === null ? [] : [r.Grupo]));
    const puntos: L.LatLngTuple[] = [];

    for (const r of filas) {
      if (r.Grupo === null || typeof r.lat !== 'number' ||
          typeof r.lng !== 'number' || !Number.isFinite(r.lat) ||
          !Number.isFinite(r.lng)) continue;
      const punto: L.LatLngTuple = [r.lat, r.lng];
      puntos.push(punto);
      const etiqueta = document.createElement('span');
      etiqueta.textContent =
        'G' + r.Grupo + ' - ' + (r.nombre ?? 'NA') + ' S' + (r.suerte ?? 'NA');
      L.circleMarker(punto, {
        radius: 6, color: color(r.Grupo), fillOpacity: 0.85, weight: 1,
      }).bindTooltip(etiqueta).addTo(mapa);
    }
    if (puntos.length) mapa.fitBounds(L.latLngBounds(puntos), { padding: [12, 12] });
    const observer = new ResizeObserver(() => mapa.invalidateSize());
    observer.observe(element);
    return () => {
      observer.disconnect();
      mapa.remove();
    };
  }, [slot]);
  return (
    <section>
      <h5>{slot ? 'Slot ' + nombre + ' · ' + slot.fecha : 'Slot ' + nombre + ': vacío'}</h5>
      <div ref={contenedor} className="rutapro-mapa-slot"
        aria-label={'Mapa del Slot ' + nombre} />
    </section>
  );
}

const numero = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export default function ComparadorAB({ a, b }: { a?: SlotAB; b?: SlotAB }) {
  const valoresA = extraerIndicadores(a);
  const valoresB = extraerIndicadores(b);
  return (
    <section className="rutapro-comparador">
      <h4 className="font-heading text-500">Slot A vs Slot B</h4>
      <div className="rutapro-mapas-ab">
        <MapaSlot slot={a} nombre="A" />
        <MapaSlot slot={b} nombre="B" />
      </div>
      <h4 className="font-heading text-500">📊 Comparativa de KPIs</h4>
      {!a && !b ? <p>Guarda slots A y B para comparar.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-300">
            <thead><tr>
              <th scope="col">Indicador</th>
              <th scope="col">Slot_A</th>
              <th scope="col">Slot_B</th>
              <th scope="col">Delta</th>
            </tr></thead>
            <tbody>{indicadoresAB.map((indicador, i) => {
              const va = valoresA[i], vb = valoresB[i];
              return (
                <tr key={indicador}>
                  <th scope="row">{indicador}</th>
                  <td>{va === null ? 'NA' : numero.format(va)}</td>
                  <td>{vb === null ? 'NA' : numero.format(vb)}</td>
                  <td>{deltaAB(va, vb)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
