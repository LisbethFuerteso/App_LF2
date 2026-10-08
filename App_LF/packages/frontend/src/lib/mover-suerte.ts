import { distanciaKm, type Suerte } from './plan-cosecha';

export interface FilaMovimiento extends Suerte {
  Grupo: number | null;
  Tipo_Grupo: 'Fuerte' | 'Débil' | null;
  Orden_Cosecha: number | null;
  Alce: string | null;
}
export type Importaciones = Record<number, number>;
export const claveMovimiento = (r: Suerte) =>
  JSON.stringify([r.hacienda, r.suerte]);

function reordenar<T extends FilaMovimiento>(rows: T[], grupo: number) {
  const bloque = rows.filter(r => r.Grupo === grupo);
  if (!bloque.length) return;

  let origen: Suerte = {
    lat: bloque.reduce((s, r) => s + r.lat!, 0) / bloque.length,
    lng: bloque.reduce((s, r) => s + r.lng!, 0) / bloque.length,
  };
  const urgente = (r: T) =>
    /Incendio con alta degradación|Óptimo de vejez/i.test(r.prioridad ?? '');
  let orden = 0;

  for (const pendientes of [
    bloque.filter(urgente),
    bloque.filter(r => !urgente(r)),
  ]) {
    while (pendientes.length) {
      const siguiente = pendientes.reduce((mejor, row) =>
        distanciaKm(origen, row) < distanciaKm(origen, mejor) ? row : mejor);
      siguiente.Orden_Cosecha = ++orden;
      pendientes.splice(pendientes.indexOf(siguiente), 1);
      origen = siguiente;
    }
  }
}

export function moverSuerte<T extends FilaMovimiento>(
  entrada: readonly T[],
  llave: string,
  destino: number,
  radio: number,
  importaciones: Readonly<Importaciones>,
) {
  const fallo = (mensaje: string) => ({
    ok: false as const, mensaje,
    plan: [...entrada], importaciones: { ...importaciones },
  });
  const seleccion = entrada.filter(r => claveMovimiento(r) === llave);
  if (!seleccion.length) return fallo('Suerte no encontrada');
  if (seleccion.length !== 1)
    return fallo('La llave Hacienda/Suerte está repetida.');

  const suerte = seleccion[0];
  const origen = suerte.Grupo;
  if (origen === null) return fallo('Suerte no asignada');
  if (origen === destino) return fallo('Ya pertenece a ese grupo');

  const contador = importaciones[destino] ?? 0;
  if (contador >= 3)
    return fallo('Grupo ' + destino + ' ya tiene 3 importadas (límite).');

  const receptoras = entrada.filter(r => r.Grupo === destino);
  if (!receptoras.length) return fallo('Grupo destino no existe');

  const centro = {
    lat: receptoras.reduce((s, r) => s + r.lat!, 0) / receptoras.length,
    lng: receptoras.reduce((s, r) => s + r.lng!, 0) / receptoras.length,
  };
  const distancia = distanciaKm(centro, suerte);
  if (!Number.isFinite(distancia) || !Number.isFinite(radio) || radio <= 0)
    return fallo('No se pudo comprobar el radio; revisar coordenadas y parámetros.');
  if (distancia > radio)
    return fallo('Fuera de radio (' + distancia.toFixed(2) +
      ' km > ' + radio.toFixed(1) + ' km).');

  const plan = entrada.map(r => ({ ...r }));
  const movida = plan.find(r => claveMovimiento(r) === llave)!;
  movida.Grupo = destino;
  movida.Tipo_Grupo = receptoras[0].Tipo_Grupo;
  if (receptoras[0].Alce !== null) movida.Alce = receptoras[0].Alce;

  reordenar(plan, origen);
  reordenar(plan, destino);

  return {
    ok: true as const,
    mensaje: '✓ Movida del Grupo ' + origen + ' al Grupo ' + destino + '.',
    plan,
    importaciones: { ...importaciones, [destino]: contador + 1 },
  };
}
