import { useState } from 'react';
import {
  descargarExcel, fechaArchivo, redondearR, type FilaExcel,
} from './lib/reportes-rutapro';

type Props = {
  filas: FilaExcel[];
  columnas: string[];
  nombre: string;
  enteras?: string[];
  fijas?: number;
  filtrosColumnas?: boolean;
  totales?: Record<string, number>;
  fondo?: (columna: string, valor: FilaExcel[string]) => string | undefined;
};

const boton = 'rounded-lg border px-400 py-200 text-300 disabled:opacity-50';

const valor = (v: FilaExcel[string]) => v instanceof Date
  ? v.toISOString().slice(0, 10)
  : String(v ?? '');

export default function TablaRutaPRO({
  filas, columnas, nombre, enteras = [], fijas = 0,
  filtrosColumnas = false, totales, fondo,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [pagina, setPagina] = useState(0);
  const [orden, setOrden] = useState<{
    columna: string; asc: boolean;
  }>();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const coincide = (v: FilaExcel[string], texto: string) =>
    valor(v).toLocaleLowerCase('es')
      .includes(texto.toLocaleLowerCase('es'));

  const visibles = filas.filter(r =>
    (!busqueda || columnas.some(c => coincide(r[c], busqueda))) &&
    columnas.every(c => !filtros[c] || coincide(r[c], filtros[c]))
  );

  if (orden) visibles.sort((a, b) => {
    const x = a[orden.columna];
    const y = b[orden.columna];
    const cmp = x == null ? (y == null ? 0 : 1)
      : y == null ? -1
      : typeof x === 'number' && typeof y === 'number' ? x - y
      : x instanceof Date && y instanceof Date
        ? x.getTime() - y.getTime()
        : valor(x).localeCompare(valor(y), 'es');
    return orden.asc ? cmp : -cmp;
  });

  const paginas = Math.max(1, Math.ceil(visibles.length / 10));
  const actual = Math.min(pagina, paginas - 1);

  const mostrar = (col: string, v: FilaExcel[string]) =>
    typeof v === 'number'
      ? new Intl.NumberFormat('es-CO', {
          minimumFractionDigits: enteras.includes(col) ? 0 : 2,
          maximumFractionDigits: enteras.includes(col) ? 0 : 2,
        }).format(v)
      : valor(v);

  async function exportar(tipo: 'copiar' | 'csv' | 'excel') {
    if (ocupado) return;
    setOcupado(true);
    setAviso('');
    setError('');

    try {
      if (tipo === 'excel') {
        await descargarExcel(nombre + '_' + fechaArchivo() + '.xlsx', [{
          nombre: 'Sheet1', filas: visibles, columnas,
        }]);
      } else {
        const matriz = [
          columnas,
          ...visibles.map(r => columnas.map(c => valor(r[c]))),
        ];

        if (tipo === 'copiar') {
          const texto = matriz.map(row => row.map(v =>
            v.replace(/[\t\r\n]+/g, ' ')
          ).join('\t')).join('\n');

          await navigator.clipboard.writeText(texto);
          setAviso('✓ Tabla copiada.');
        } else {
          const texto = '\uFEFF' + matriz.map(row => row.map(v =>
            '"' + v.replace(/"/g, '""') + '"'
          ).join(',')).join('\r\n');

          const url = URL.createObjectURL(new Blob([texto], {
            type: 'text/csv;charset=utf-8',
          }));
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = nombre + '_' + fechaArchivo() + '.csv';
          document.body.append(enlace);
          enlace.click();
          enlace.remove();
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message : 'No se pudo exportar la tabla.');
    } finally {
      setOcupado(false);
    }
  }

  const estilo = (indice: number, backgroundColor = 'white') => ({
    minWidth: 180, width: 180, backgroundColor,
    ...(indice < fijas ? {
      position: 'sticky' as const, left: indice * 180, zIndex: 1,
    } : {}),
  });

  return (
    <section className="space-y-400" aria-label={nombre}>
      <div className="flex flex-wrap items-center gap-300">
        {(['copiar', 'csv', 'excel'] as const).map(tipo => (
          <button key={tipo} type="button" className={boton}
            disabled={ocupado} onClick={() => void exportar(tipo)}>
            {tipo === 'copiar' ? 'Copiar' : tipo === 'csv' ? 'CSV' : 'Excel'}
          </button>
        ))}
        <label>
          Buscar:{' '}
          <input type="search" value={busqueda}
            className="rounded border p-200"
            onChange={e => {
              setBusqueda(e.target.value);
              setPagina(0);
            }} />
        </label>
      </div>

      {aviso && <p role="status">{aviso}</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}

      <div className="overflow-x-auto">
        <table className="text-left text-300" style={{
          borderCollapse: 'separate', borderSpacing: 0,
          tableLayout: 'fixed', width: columnas.length * 180,
        }}>
          <thead>
            <tr>{columnas.map((col, i) => (
              <th key={col} scope="col" className="px-400 py-200"
                style={estilo(i, '#f3f6fa')}
                aria-sort={orden?.columna === col
                  ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => {
                  setOrden({
                    columna: col,
                    asc: orden?.columna === col ? !orden.asc : true,
                  });
                  setPagina(0);
                }}>
                  {col}{orden?.columna === col
                    ? (orden.asc ? ' ▲' : ' ▼') : ''}
                </button>
              </th>
            ))}</tr>

            {filtrosColumnas && (
              <tr>{columnas.map((col, i) => (
                <th key={col} className="px-400 py-200"
                  style={estilo(i, '#f3f6fa')}>
                  <input type="search" aria-label={'Filtrar ' + col}
                    value={filtros[col] ?? ''}
                    className="w-32 rounded border p-200"
                    onChange={e => {
                      setFiltros(old => ({ ...old, [col]: e.target.value }));
                      setPagina(0);
                    }} />
                </th>
              ))}</tr>
            )}
          </thead>

          <tbody>
            {visibles.slice(actual * 10, (actual + 1) * 10)
              .map((row, indice) => (
                <tr key={indice}>
                  {columnas.map((col, i) => (
                    <td key={col} className="border-b px-400 py-200"
                      style={{
                        ...estilo(i, fondo?.(col, row[col])),
                        fontWeight: fondo?.(col, row[col])
                          ? 'bold' : undefined,
                      }}>
                      {mostrar(col, row[col])}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>

          {totales && (
            <tfoot>
              <tr>{columnas.map((col, i) => (
                <th key={col} className="px-400 py-200"
                  style={estilo(i, '#ecf0f1')}>
                  {i === 0 ? 'TOTAL' : totales[col] !== undefined
                    ? new Intl.NumberFormat('es-CO', {
                        minimumFractionDigits: totales[col],
                        maximumFractionDigits: totales[col],
                      }).format(redondearR(
                        filas.reduce((s, r) => s + (
                          typeof r[col] === 'number'
                            ? r[col] as number : 0
                        ), 0),
                        totales[col],
                      ))
                    : ''}
                </th>
              ))}</tr>
            </tfoot>
          )}
        </table>
      </div>

      {!visibles.length && (
        <p>No hay registros para los filtros seleccionados.</p>
      )}

      <div className="flex justify-between gap-300">
        <button type="button" className={boton} disabled={!actual}
          onClick={() => setPagina(actual - 1)}>Anterior</button>
        <span>
          {visibles.length} registros · Página {actual + 1} de {paginas}
        </span>
        <button type="button" className={boton}
          disabled={actual + 1 >= paginas}
          onClick={() => setPagina(actual + 1)}>Siguiente</button>
      </div>
    </section>
  );
}
