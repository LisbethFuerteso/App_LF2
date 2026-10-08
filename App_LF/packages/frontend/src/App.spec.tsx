import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { cargarRutaPRO, RutaPRODataError, type DatosRutaPRO } from './lib/rutapro';

vi.mock('./lib/rutapro', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/rutapro')>();
  return { ...actual, cargarRutaPRO: vi.fn() };
});

const fixture = {
  modo: 'validacion',
  publicacion: {
    estado: 'COMPLETO',
    perfil: 'validacion',
    aptoOperativo: false,
    fechaCorte: new Date('2026-10-07T00:00:00Z'),
    idEjecucion: 'ejecucion-prueba',
  },
  contrato: [],
  df_programa: [
    { hacienda: '001', nombre: 'Hacienda prueba norte', suerte: '01A', tonPred: 120 },
    { hacienda: '002', nombre: 'Hacienda prueba sur', suerte: '02B', tonPred: 80 },
  ],
  df_entrada_frentes: [],
  df_control_calidad: [],
} satisfies DatosRutaPRO;

describe('RutaPRO', () => {
  beforeEach(() => {
    vi.mocked(cargarRutaPRO).mockReset();
    vi.mocked(cargarRutaPRO).mockResolvedValue(fixture);
  });

  it('muestra el programa y señala el modo de validación', async () => {
    render(<App />);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Hacienda prueba norte')).toBeVisible();
    expect(within(table).getByText('01A')).toBeVisible();
    expect(screen.getByText(/Modo de validación/)).toBeVisible();
    expect(cargarRutaPRO).toHaveBeenCalledWith('validacion');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('filtra por suerte conservando los identificadores', async () => {
    render(<App />);
    await screen.findByRole('table');
    fireEvent.change(
      screen.getByLabelText('Buscar hacienda, suerte, nombre o zona'),
      { target: { value: '02B' } },
    );
    const table = screen.getByRole('table');
    expect(within(table).getByText('Hacienda prueba sur')).toBeVisible();
    expect(within(table).queryByText('Hacienda prueba norte')).toBeNull();
  });

  it('muestra el error de publicación sin presentar datos', async () => {
    vi.mocked(cargarRutaPRO).mockRejectedValue(
      new RutaPRODataError('La publicación cambió durante la lectura. Volver a cargar.'),
    );
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La publicación cambió durante la lectura.',
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Actualizar datos' })).toBeEnabled();
  });
});
