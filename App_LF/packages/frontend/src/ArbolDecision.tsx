import { useEffect, useId, useRef, useState } from 'react';
import { ARBOL_R } from './lib/arbol-rutapro';

type Props = { onCerrar: () => void };

export default function ArbolDecision({ onCerrar }: Props) {
  const id = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const grafico = useRef<HTMLDivElement>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    const element = dialogo.current;
    element?.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);

  useEffect(() => {
    let activo = true;
    async function dibujar() {
      try {
        const { instance } = await import('@viz-js/viz');
        const viz = await instance();
        if (!activo) return;
        const svg = viz.renderSVGElement(ARBOL_R, { engine: 'dot' });
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Árbol de decisión del algoritmo de bloqueo');
        grafico.current?.replaceChildren(svg);
        setCargando(false);
      } catch {
        if (activo) {
          setError('No se pudo dibujar el árbol de decisión.');
          setCargando(false);
        }
      }
    }
    void dibujar();
    return () => { activo = false; };
  }, [reintento]);

  return (
    <dialog ref={dialogo} className="rutapro-arbol"
      aria-labelledby={id + '-titulo'}
      onCancel={e => { e.preventDefault(); onCerrar(); }}
      onClick={e => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right ||
            e.clientY < rect.top || e.clientY > rect.bottom) onCerrar();
      }}>
      <h2 id={id + '-titulo'}>
        🌳 Árbol de decisión del algoritmo de bloqueo
      </h2>
      <div className="rutapro-arbol-contenido">
        {cargando && <p role="status">Preparando árbol de decisión…</p>}
        {error && (
          <div>
            <p role="alert">{error}</p>
            <button type="button" onClick={() => {
              setError('');
              setCargando(true);
              setReintento(n => n + 1);
            }}>Reintentar</button>
          </div>
        )}
        <div ref={grafico} className="rutapro-arbol-grafico" />
      </div>
      <footer>
        <button type="button" onClick={onCerrar}>Cerrar</button>
      </footer>
    </dialog>
  );
}
