import { useEffect, useRef, useState } from 'react';

type Props = { valores: number[] };

export default function HistogramaSDAM({ valores }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = container.current;
    if (!element || !valores.length) return;
    let active = true;
    let limpiar: (() => void) | undefined;

    void import('plotly.js-cartesian-dist-min').then(async module => {
      if (!active) return;
      const Plotly = module.default;
      const traza: Partial<import('plotly.js').PlotData> & {
        nbinsx: number;
      } = {
        x: valores, type: 'histogram', nbinsx: 30,
        marker: { color: '#0C25A3', line: { color: 'white', width: 1 } },
      };
      await Plotly.newPlot(element, [traza], {
        title: { text: '<b>Distribución de SDAM</b>', x: 0 },
        xaxis: { title: { text: 'SDAM' } },
        yaxis: { title: { text: 'Frecuencia' } },
        height: 300,
        font: { family: 'Segoe UI, sans-serif' },
        plot_bgcolor: 'white', paper_bgcolor: 'white',
        shapes: [
          { type: 'line', x0: 6, x1: 6, y0: 0, y1: 1, yref: 'paper',
            line: { color: '#f1c40f', dash: 'dash', width: 2 } },
          { type: 'line', x0: 8, x1: 8, y0: 0, y1: 1, yref: 'paper',
            line: { color: '#27ae60', dash: 'dash', width: 2 } },
          { type: 'line', x0: 12, x1: 12, y0: 0, y1: 1, yref: 'paper',
            line: { color: '#c0392b', dash: 'dash', width: 2 } },
        ],
      }, { displayModeBar: false, responsive: true });

      if (!active) {
        Plotly.purge(element);
        return;
      }
      const observer = new ResizeObserver(() => {
        if (element.offsetWidth) void Plotly.Plots.resize(element);
      });
      observer.observe(element);
      limpiar = () => { observer.disconnect(); Plotly.purge(element); };
    }).catch(cause => {
      if (active) setError(cause instanceof Error
        ? cause.message : 'No se pudo dibujar el histograma.');
    });

    return () => { active = false; limpiar?.(); };
  }, [valores]);

  return (
    <>
      {!valores.length && <p>No hay valores SDAM disponibles.</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div ref={container} style={{ width: '100%', minHeight: 300 }} />
    </>
  );
}
