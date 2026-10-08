import L from 'leaflet';

let carga: Promise<void> | undefined;

export function prepararHeatmap(): Promise<void> {
  if (!carga) {
    // El plugin utiliza la misma instancia de Leaflet que el mapa.
    Object.assign(window, { L });
    carga = import('leaflet.heat').then(() => {
      if (typeof L.heatLayer !== 'function')
        throw new Error('No se pudo iniciar la capa de calor.');
    });
  }
  return carga;
}
