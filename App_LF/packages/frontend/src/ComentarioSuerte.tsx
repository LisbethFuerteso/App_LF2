import { useEffect, useId, useRef, useState } from 'react';
import type { Plan } from './lib/reportes-rutapro';
import {
  ComentarioError, leerComentario, guardarComentario,
} from './lib/comentarios-rutapro';

type Props = {
  suerte: Plan[number];
  onCerrar: () => void;
  onGuardado: (texto: string) => void;
};

export default function ComentarioSuerte({
  suerte, onCerrar, onGuardado,
}: Props) {
  const id = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const entrada = useRef<HTMLTextAreaElement>(null);
  const [estado, setEstado] = useState({
    texto: '', listo: false, error: '',
  });
  const [reintento, setReintento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');

  useEffect(() => {
    const element = dialogo.current;
    element?.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);

  useEffect(() => {
    let activo = true;
    leerComentario(suerte.hacienda, suerte.suerte).then(texto => {
      if (activo) setEstado({ texto, listo: true, error: '' });
    }).catch(cause => {
      if (activo) setEstado({
        texto: '', listo: false,
        error: cause instanceof ComentarioError ? cause.message :
          'No se pudo leer el comentario. Revisar sesión, permisos y publicación.',
      });
    });
    return () => { activo = false; };
  }, [suerte.hacienda, suerte.suerte, reintento]);

  useEffect(() => {
    if (estado.listo) entrada.current?.focus();
  }, [estado.listo]);

  async function guardar() {
    if (guardando || !estado.listo) return;
    setGuardando(true);
    setErrorGuardado('');
    try {
      const texto = await guardarComentario(
        suerte.hacienda, suerte.suerte, estado.texto,
      );
      onGuardado(texto);
    } catch (cause) {
      setErrorGuardado(cause instanceof ComentarioError ? cause.message :
        'No se pudo guardar el comentario. El texto se conserva; inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <dialog ref={dialogo} className="rutapro-comentario"
      aria-labelledby={id + '-titulo'}
      onCancel={e => {
        e.preventDefault();
        if (!guardando) onCerrar();
      }}
      onClick={e => {
        if (guardando || e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right ||
            e.clientY < rect.top || e.clientY > rect.bottom) onCerrar();
      }}>
      <form onSubmit={e => { e.preventDefault(); void guardar(); }}>
        <h2 id={id + '-titulo'}>
          📝 Comentarios — {suerte.nombre} S{suerte.suerte}
        </h2>
        <p>Hacienda: {suerte.hacienda} · Grupo: {suerte.Grupo}
          {' '}({suerte.Tipo_Grupo})</p>
        <p>Prioridad: {suerte.prioridad ?? 'Sin dato'}</p>

        {!estado.listo && !estado.error &&
          <p role="status">Leyendo comentario…</p>}
        {estado.error && (
          <div>
            <p role="alert">{estado.error}</p>
            <button type="button" onClick={() => {
              setEstado({ texto: '', listo: false, error: '' });
              setReintento(n => n + 1);
            }}>Reintentar</button>
          </div>
        )}
        {estado.listo && (
          <>
            <label htmlFor={id + '-texto'}>Comentario</label>
            <textarea ref={entrada} id={id + '-texto'} rows={4}
              value={estado.texto} disabled={guardando}
              onChange={e => setEstado(old => ({
                ...old, texto: e.target.value,
              }))} />
          </>
        )}
        {errorGuardado && <p role="alert">{errorGuardado}</p>}
        {guardando && <p role="status">Guardando comentario…</p>}
        <footer>
          <button type="button" disabled={guardando} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando || !estado.listo}>
            💾 Guardar
          </button>
        </footer>
      </form>
    </dialog>
  );
}
