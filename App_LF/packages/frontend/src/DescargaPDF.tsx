import { useRef, useState } from 'react';
import type { Plan, FiltrosMapa } from './lib/reportes-rutapro';

export default function DescargaPDF({
  plan, filtros, pendiente,
}: { plan: Plan; filtros: FiltrosMapa; pendiente: boolean }) {
  const [ocupado, setOcupado] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [error, setError] = useState('');
  const bloqueo = useRef(false);

  async function descargar(modo: 'consolidado' | 'grupos') {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError('');
    setProgreso('Preparando PDF…');
    try {
      const { descargarPDF } = await import('./lib/pdf-rutapro');
      await descargarPDF(plan, filtros, modo, setProgreso);
      setProgreso('✓ Archivo generado.');
    } catch (cause) {
      setProgreso('');
      setError(cause instanceof Error ? cause.message : 'No se pudo generar el PDF.');
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  return (
    <div className="rutapro-descargas-pdf" aria-busy={ocupado}>
      <div>
        <button type="button" className="rutapro-descarga"
          disabled={ocupado || pendiente}
          onClick={() => void descargar('consolidado')}>
          📑 PDF Consolidado
        </button>
        <button type="button" className="rutapro-descarga"
          disabled={ocupado || pendiente}
          onClick={() => void descargar('grupos')}>
          📄 PDF por Grupo
        </button>
      </div>
      {progreso && <p role="status">{progreso}</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  );
}
