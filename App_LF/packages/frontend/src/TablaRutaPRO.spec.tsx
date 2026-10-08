import {
  cleanup, fireEvent, render, screen, within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TablaRutaPRO from './TablaRutaPRO';

afterEach(cleanup);

describe('Tablas de RutaPRO', () => {
  it('pagina en diez filas, busca en todo el conjunto y conserva el total', () => {
    render(
      <TablaRutaPRO nombre="Clima"
        columnas={['Nombre', 'Ton_pred']}
        filas={Array.from({ length: 12 }, (_, i) => ({
          Nombre: 'S' + (i + 1), Ton_pred: 100,
        }))}
        totales={{ Ton_pred: 1 }} />
    );

    expect(screen.queryByText('S11')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('S11')).toBeTruthy();

    fireEvent.change(screen.getByRole('searchbox', { name: /Buscar/ }), {
      target: { value: 'S12' },
    });

    expect(screen.getByText('S12')).toBeTruthy();
    expect(screen.queryByText('S11')).toBeNull();

    const total = screen.getByText('TOTAL').closest('tr')!;
    expect(within(total).getByText('1.200,0')).toBeTruthy();
  });

  it('ordena numericamente en ambos sentidos', () => {
    render(
      <TablaRutaPRO nombre="Resumen"
        columnas={['Nombre', 'Ton_pred']}
        filas={[
          { Nombre: 'B', Ton_pred: 200 },
          { Nombre: 'A', Ton_pred: 100 },
        ]} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ton_pred' }));
    expect(screen.getAllByRole('row')[1].textContent).toContain('A');

    fireEvent.click(screen.getByRole('button', { name: 'Ton_pred ▲' }));
    expect(screen.getAllByRole('row')[1].textContent).toContain('B');
  });
});
