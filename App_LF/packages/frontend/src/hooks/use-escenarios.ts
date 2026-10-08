import { useEffect, useRef, useState } from 'react';
import {
  DocumentoError, listarDocumentos, guardarDocumento,
} from '../lib/documentos-rutapro';
import {
  EscenarioError, deserializarEscenario, serializarEscenario,
  type Escenario,
} from '../lib/escenarios-rutapro';

export function useEscenarios() {
  const [registros, setRegistros] = useState<Escenario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [intento, setIntento] = useState(0);
  const ocupada = useRef(false);

  useEffect(() => {
    let activo = true;
    Promise.all([listarDocumentos('preset'), listarDocumentos('historial')])
      .then(grupos => {
        const filas = grupos.flat().map(deserializarEscenario);
        if (activo) { setRegistros(filas); setCargando(false); }
      }).catch(() => {
        if (activo) {
          setError('No se pudieron leer los escenarios. Revisar sesión, permisos y publicación.');
          setCargando(false);
        }
      });
    return () => { activo = false; };
  }, [intento]);

  function mostrarError(texto: string) { setError(texto); setMensaje(''); }
  function reintentar() {
    if (ocupada.current) return;
    setCargando(true); setError(''); setIntento(n => n + 1);
  }
  async function guardar(escenario: Escenario): Promise<boolean> {
    if (ocupada.current) return false;
    ocupada.current = true; setPendiente(true); setError(''); setMensaje('');
    try {
      const texto = await guardarDocumento(
        escenario.tipo, escenario.nombre, serializarEscenario(escenario),
      );
      const guardado = deserializarEscenario(texto);
      setRegistros(old => {
        const existe = old.some(r => r.tipo === guardado.tipo && r.nombre === guardado.nombre);
        return existe ? old.map(r =>
          r.tipo === guardado.tipo && r.nombre === guardado.nombre ? guardado : r)
          : [...old, guardado];
      });
      setMensaje('✓ ' + (guardado.tipo === 'preset' ? 'Preset' : 'Plan') +
        " '" + guardado.nombre + "' guardado.");
      return true;
    } catch (cause) {
      setError(cause instanceof EscenarioError || cause instanceof DocumentoError
        ? cause.message : 'No se pudo guardar. Los campos se conservan; inténtalo de nuevo.');
      return false;
    } finally { ocupada.current = false; setPendiente(false); }
  }
  async function eliminar(escenario: Escenario): Promise<boolean> {
    if (ocupada.current) return false;
    ocupada.current = true; setPendiente(true); setError(''); setMensaje('');
    try {
      await guardarDocumento(escenario.tipo, escenario.nombre, '');
      setRegistros(old => old.filter(r =>
        r.tipo !== escenario.tipo || r.nombre !== escenario.nombre));
      setMensaje("🗑️ '" + escenario.nombre + "' eliminado.");
      return true;
    } catch {
      setError('No se pudo eliminar. El registro se conserva.');
      return false;
    } finally { ocupada.current = false; setPendiente(false); }
  }
  return { registros, cargando, pendiente, error, mensaje,
    guardar, eliminar, reintentar, mostrarError };
}
export type EstadoEscenarios = ReturnType<typeof useEscenarios>;
