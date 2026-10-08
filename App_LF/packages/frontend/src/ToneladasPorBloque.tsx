import { useEffect, useRef } from 'react';
import { redondearR, type ResumenR } from './lib/reportes-rutapro';

export default function ToneladasPorBloque({
  filas,
}: { filas: ResumenR[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !filas.length) return;

    const host = document.createElement('div');
    container.current.replaceChildren(host);
    let active = true;
    let plotly: typeof import('plotly.js-cartesian-dist-min') | undefined;

    void import('plotly.js-cartesian-dist-min')
      .then(async ({ default: Plotly }) => {
        if (!active) return;
        plotly = Plotly;

        const trazas = (['Fuerte', 'Débil'] as const)
          .filter(tipo => filas.some(r => r.Tipo_Grupo === tipo))
          .map(tipo => {
            const bloque = filas.filter(r => r.Tipo_Grupo === tipo);
            return {
              type: 'bar' as const,
              name: tipo,
              x: bloque.map(r =>
                'G' + r.Grupo + ' (' + (r.Alce ?? 'NA') + ')'),
              y: bloque.map(r => r.Ton_pred_total),
              marker: {
                color: tipo === 'Fuerte' ? '#009541' : '#c0392b',
              },
              text: bloque.map(r =>
                new Intl.NumberFormat('en-US').format(
                  redondearR(r.Ton_pred_total, 0)
                ) + ' ton'),
              textposition: 'outside' as const,
              hovertemplate: '<b>%{x}</b><br>Ton: %{y:,.0f}<extra></extra>',
            };
          });

        await Plotly.newPlot(host, trazas, {
          height: 320,
          title: { text: '<b>Toneladas por bloque</b>', x: 0 },
          xaxis: { title: { text: '' }, tickangle: -30 },
          yaxis: { title: { text: 'Ton predichas' } },
          margin: { t: 50, b: 80 },
          plot_bgcolor: 'white',
          paper_bgcolor: 'white',
        }, {
          responsive: true,
          displayModeBar: false,
        });

        if (!active) Plotly.purge(host);
      }).catch(() => {
        if (active)
          host.textContent =
            'No se pudo cargar el gráfico. La tabla sigue disponible.';
      });

    return () => {
      active = false;
      plotly?.purge(host);
      host.remove();
    };
  }, [filas]);

  if (!filas.length)
    return <p>No hay bloques para mostrar en el gráfico.</p>;

  return <div ref={container} role="img"
    aria-label="Toneladas por bloque"
    style={{ width: '100%', minHeight: 320 }} />;
}
