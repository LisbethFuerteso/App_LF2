import PlanCosecha from './PlanCosecha';
import { useEffect, useState } from 'react';
import { cargarRutaPRO, RutaPRODataError, type DatosRutaPRO, type ModoRutaPRO } from './lib/rutapro';

const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const button = 'rounded-lg border px-400 py-200 text-300 font-semibold transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 disabled:cursor-not-allowed';

function display(value: unknown) {
  if (value == null) return 'Sin dato';
  return typeof value === 'number' ? number.format(value) : String(value);
}

function cutoff(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value.slice(0, 10) : 'Sin fecha';
}

export default function App() {
  const [modo, setModo] = useState<ModoRutaPRO>('validacion');
  const [revision, setRevision] = useState(0);
  const [datos, setDatos] = useState<DatosRutaPRO>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    let active = true;
    cargarRutaPRO(modo).then(result => {
      if (active) { setDatos(result); setLoading(false); }
    }).catch(cause => {
      if (!active) return;
      setError(cause instanceof RutaPRODataError ? cause.message :
        'No se pudieron leer los datos. Comprueba la sesión, los permisos del Lakehouse y la publicación del conector.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [modo, revision]);

  function reload(next: ModoRutaPRO = modo) {
    setLoading(true);
    setDatos(undefined);
    setError(undefined);
    setPage(0);
    setModo(next);
    setRevision(value => value + 1);
  }

  const needle = search.trim().toLocaleLowerCase('es-CO');
  const records = (datos?.df_programa ?? []).filter(row =>
    [row.hacienda, row.suerte, row.nombre, row.zona]
      .some(value => String(value ?? '').toLocaleLowerCase('es-CO').includes(needle)));
  const pageCount = Math.max(1, Math.ceil(records.length / 20));
  const visible = records.slice(page * 20, (page + 1) * 20);

  return (
    <main className="rutapro min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-rutapro p-400 md:p-800 space-y-600">
        <header className="flex flex-wrap items-center justify-between gap-400 border-b pb-600">
          <div>
            <p className="text-300 font-semibold text-primary">INCAUCA S.A.S</p>
            <h1 className="font-heading text-hero-900 leading-hero-900">🚜 Cosecha estratégica 4.1 - INCAUCA S.A.S</h1>
            <p className="text-400 text-muted-foreground">Planeación estratégica de cosecha para el mejoramiento de la sacarosa junto a la eficiencia operativa</p>
          </div>
          <div className="flex flex-wrap items-center gap-200">
            <button className={button} disabled={loading} onClick={() => reload()}>Actualizar datos</button>
            <button className={button} disabled={loading}
              onClick={() => reload(modo === 'validacion' ? 'operativo' : 'validacion')}>
              {modo === 'validacion' ? 'Consultar modo operativo' : 'Consultar validación'}
            </button>
            
          </div>
        </header>

        {modo === 'validacion' && (
          <p className="rounded-lg border bg-accent p-400 text-300">
            Modo de validación. Los datos se muestran para revisión; esta vista no habilita decisiones operativas.
          </p>
        )}

        {loading && <p role="status" className="rounded-xl border bg-card p-600">Leyendo y comprobando la publicación…</p>}
        {error && <div role="alert" className="rounded-xl border border-destructive bg-card p-600">
          <h2 className="font-semibold">No se pudieron cargar los resultados</h2>
          <p className="mt-200 text-300">{error}</p>
        </div>}

        {datos && !loading && (
          <>
            <section aria-label="Resumen de publicación" className="rounded-xl border bg-card p-600">
              <p className="text-300 text-muted-foreground">Fecha de corte</p>
              <p className="font-heading text-600">{cutoff(datos.publicacion.fechaCorte)}</p>
              <p className="mt-200 text-300">
                Perfil: {display(datos.publicacion.perfil)} ·
                Apto operativo: {datos.publicacion.aptoOperativo === true ? 'Sí' : 'No'}
              </p>
              <dl className="mt-600 grid grid-cols-2 gap-600 md:grid-cols-4">
                {[
                  ['Registros del programa', datos.df_programa.length],
                  ['Registros climáticos', (datos.contrato.find(row => row.objeto === 'df_climaticas')?.filas ?? 'Sin dato')],
                  ['Frentes disponibles', datos.df_entrada_frentes.length],
                  ['Casos para revisión', (datos.contrato.find(row => row.objeto === 'df_pendientes')?.filas ?? 'Sin dato')],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-300 text-muted-foreground">{label}</dt>
                    <dd className="font-numeric text-hero-800 font-semibold">{display(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <PlanCosecha key={datos.publicacion.idEjecucion} datos={datos} />

            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-end justify-between gap-400 p-600">
                <div>
                  <h2 className="font-heading text-600">Programa preparado</h2>
                  <p className="text-300 text-muted-foreground">{number.format(records.length)} registros encontrados</p>
                </div>
                <label className="text-300">
                  Buscar hacienda, suerte, nombre o zona
                  <input type="search" value={search}
                    onChange={event => { setSearch(event.target.value); setPage(0); }}
                    className="mt-100 block w-full rounded-lg border bg-background px-300 py-200 text-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" />
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-300">
                  <caption className="sr-only">Registros del programa de cosecha preparado</caption>
                  <thead className="bg-muted text-muted-foreground">
                    <tr>{['Hacienda', 'Nombre', 'Suerte', 'Zona', 'Año / mes', 'Toneladas estimadas', 'Edad actual', 'Prioridad']
                      .map(label => <th key={label} scope="col" className="px-400 py-300 font-semibold">{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {visible.map((row, index) => (
                      <tr key={[row.hacienda, row.suerte, row.ano, row.mes, page, index].join('|')}
                        className="border-b hover:bg-accent">
                        {[row.hacienda, row.nombre, row.suerte, row.zona,
                          String(row.ano ?? 'Sin dato') + ' / ' + String(row.mes ?? 'Sin dato'),
                          row.tonPred, row.edadHoy, row.prioridad]
                          .map((value, column) => <td key={column} className="px-400 py-300">{display(value)}</td>)}
                      </tr>
                    ))}
                    {!visible.length && <tr><td colSpan={8} className="p-600 text-muted-foreground">
                      {datos.df_programa.length ? 'No hay coincidencias con la búsqueda.' : 'La publicación no contiene registros del programa.'}
                    </td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-300 p-400">
                <button className={button} disabled={page === 0} onClick={() => setPage(value => value - 1)}>Anterior</button>
                <span className="text-300">Página {page + 1} de {pageCount}</span>
                <button className={button} disabled={page + 1 >= pageCount} onClick={() => setPage(value => value + 1)}>Siguiente</button>
              </div>
            </section>

            <section className="rounded-xl border bg-card p-600">
              <h2 className="font-heading text-600">Controles de calidad</h2>
              <ul className="mt-400 space-y-300">
                {datos.df_control_calidad.map((row, index) => (
                  <li key={index} className="border-b pb-300 text-300">
                    <strong>{display(row.modulo)} · {display(row.estado)}</strong>
                    <p className="text-muted-foreground">{display(row.detalle)}</p>
                  </li>
                ))}
              </ul>
              {!datos.df_control_calidad.length && <p className="mt-300 text-300">No hay controles registrados en esta publicación.</p>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
