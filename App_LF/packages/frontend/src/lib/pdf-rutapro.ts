import type { Plan, FiltrosMapa } from './reportes-rutapro';
import { fechaArchivo, redondearR } from './reportes-rutapro';

export interface GrupoPDF {
  grupo: number;
  filas: Plan;
}

export function seleccionarGruposPDF(
  plan: Plan, filtros: FiltrosMapa,
): GrupoPDF[] {
  // En el R, PDF usa solo sel_grupo: no filtra por Alce ni Prioridad.
  const ids = filtros.grupo.length
    ? filtros.grupo.map(v => Number(v))
    : [...new Set(plan.flatMap(r => r.Grupo === null ? [] : [r.Grupo]))]
      .sort((a, b) => a - b);

  if (ids.some(g => !Number.isSafeInteger(g) || g <= 0))
    throw new Error('La selección de grupos es inválida.');

  return [...new Set(ids)].map(grupo => ({
    grupo,
    filas: plan.filter(r => r.Grupo === grupo)
      .sort((a, b) => (a.Orden_Cosecha ?? 0) - (b.Orden_Cosecha ?? 0)),
  })).filter(g => g.filas.length > 0);
}

const escapar = (valor: unknown): string => String(valor ?? '—')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formato = (valor: number, decimales: number): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimales,
  }).format(redondearR(valor, decimales));

function fechaGenerada(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date());
}

export function cabeceraGrupoPDF(grupo: GrupoPDF, fecha: string): string {
  const filas = grupo.filas;
  const primera = filas[0];
  if (!primera) throw new Error('El grupo no tiene suertes.');
  const ton = filas.reduce((s, r) => s + (r.tonPred ?? 0), 0);
  const area = filas.reduce((s, r) => s + (r.areaNeta ?? 0), 0);
  const horas = redondearR(ton / 60 + 1, 1);
  return '<header><h2>🚜 Plan de Cosecha - Grupo ' + grupo.grupo +
    ' (' + escapar(primera.Tipo_Grupo) + ')</h2>' +
    '<div>Frente asignado: <b>' + escapar(primera.Alce) +
    '</b> · Generado: ' + escapar(fecha) + '</div></header>' +
    '<section class="kpis">' +
    '<div><small>Toneladas</small><strong>' + formato(ton, 0) + '</strong></div>' +
    '<div><small>Área (ha)</small><strong>' + formato(area, 1) + '</strong></div>' +
    '<div><small>Tiempo</small><strong>' + horas.toFixed(1) + ' h</strong></div>' +
    '<div><small>Suertes</small><strong>' + filas.length + '</strong></div>' +
    '</section><table><thead><tr>' +
    '<th>#</th><th>Suerte</th><th>Hacienda</th><th>Coordenadas</th>' +
    '<th>Prioridad</th><th>Ton</th><th>Madurante</th>' +
    '</tr></thead><tbody></tbody></table>' +
    '<footer>Cosecha estratégica 4.1</footer>';
}

export function filaGrupoPDF(
  fila: Plan[number], tipoGrupo: Plan[number]['Tipo_Grupo'],
): string {
  const coordenadas = typeof fila.lat === 'number' &&
    typeof fila.lng === 'number'
    ? fila.lat.toFixed(4) + ', ' + fila.lng.toFixed(4) : '—';
  const color = tipoGrupo === 'Fuerte' ? '#27ae60' : '#c0392b';
  return '<td class="orden" style="background:' + color + '">' +
    escapar(fila.Orden_Cosecha) + '</td>' +
    '<td>' + escapar(fila.nombre) + ' - S' + escapar(fila.suerte) + '</td>' +
    '<td>' + escapar(fila.hacienda) + '</td>' +
    '<td>' + escapar(coordenadas) + '</td>' +
    '<td>' + escapar(fila.prioridad) + '</td>' +
    '<td class="ton">' + formato(fila.tonPred ?? 0, 1) + '</td>' +
    '<td>' + escapar(fila.madurante) + '</td>';
}

const estilos = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: white; color: black; }
.page {
  width: 1047px; padding: 20px;
  font-family: "Segoe UI", sans-serif; font-size: 11px;
}
header {
  background: linear-gradient(135deg,#0C25A3,#00B1A9);
  color: white; padding: 15px 20px; border-radius: 6px;
  margin-bottom: 15px;
}
h2 { margin: 0; font-size: 22px; }
header div { font-size: 13px; opacity: .9; margin-top: 4px; }
.kpis { display: flex; gap: 10px; margin-bottom: 15px; }
.kpis div {
  flex: 1; padding: 10px; background: #f8f9fa;
  border-radius: 4px; border-left: 3px solid #0C25A3;
}
.kpis div:nth-child(2) { border-color: #009541; }
.kpis div:nth-child(3) { border-color: #00B1A9; }
.kpis div:nth-child(4) { border-color: #FDC300; }
.kpis small {
  display: block; font-size: 10px; color: #666; text-transform: uppercase;
}
.kpis strong { display: block; font-size: 20px; color: #0C25A3; }
.kpis div:nth-child(2) strong { color: #009541; }
.kpis div:nth-child(3) strong { color: #00B1A9; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
thead { background: #0C25A3; color: white; }
th { padding: 6px; text-align: left; }
td { padding: 4px 6px; vertical-align: top; overflow-wrap: anywhere; }
th:nth-child(1) { width: 4%; }
th:nth-child(2) { width: 22%; }
th:nth-child(3) { width: 9%; }
th:nth-child(4) { width: 16%; }
th:nth-child(5) { width: 22%; }
th:nth-child(6) { width: 9%; text-align: right; }
th:nth-child(7) { width: 18%; }
.orden { text-align: center; font-weight: bold; color: white; }
.ton { text-align: right; }
footer {
  margin-top: 15px; font-size: 10px; color: #888;
  border-top: 1px solid #ccc; padding-top: 8px;
}
`;

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function descargarPDF(
  plan: Plan, filtros: FiltrosMapa,
  modo: 'consolidado' | 'grupos',
  progreso: (mensaje: string) => void,
): Promise<void> {
  const grupos = seleccionarGruposPDF(plan, filtros);
  if (!grupos.length)
    throw new Error('No hay grupos seleccionados para generar PDF.');

  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'), import('html2canvas'),
  ]);
  const fecha = fechaGenerada();
  const fechaNombre = fechaArchivo();

  const iframe = document.createElement('iframe');
  iframe.title = 'Preparación de PDF';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:-12000px;top:0;width:1100px;height:900px;border:0;pointer-events:none;';
  const listo = new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error('No se pudo preparar el documento PDF.'));
  });
  iframe.srcdoc = '<!doctype html><html><head><meta charset="UTF-8">' +
    '<style>' + estilos + '</style></head><body></body></html>';
  document.body.append(iframe);

  try {
    await listo;
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('No se pudo acceder al documento PDF.');
    await doc.fonts.ready;
    const alturaPagina = 718;
    const documento = () => new jsPDF({
      orientation: 'landscape', unit: 'mm', format: 'a4', compress: true,
    });
    const consolidado = documento();
    let paginasConsolidado = 0;
    const zip = modo === 'grupos'
      ? new (await import('jszip')).default() : undefined;

    function nuevaPagina(grupo: GrupoPDF) {
      if (!doc) throw new Error('Documento no disponible.');
      const pagina = doc.createElement('div');
      pagina.className = 'page';
      // Todo valor de datos se escapa en las funciones anteriores.
      pagina.innerHTML = cabeceraGrupoPDF(grupo, fecha);
      doc.body.replaceChildren(pagina);
      return pagina;
    }

    for (let indice = 0; indice < grupos.length; indice++) {
      const grupo = grupos[indice];
      progreso('Generando grupo ' + (indice + 1) + ' de ' + grupos.length + '…');
      const pdf = modo === 'consolidado' ? consolidado : documento();
      let paginasGrupo = 0;
      let pagina = nuevaPagina(grupo);

      async function emitirPagina() {
        const canvas = await html2canvas(pagina, {
          scale: 2, backgroundColor: '#ffffff', logging: false,
          width: 1047, height: alturaPagina,
          windowWidth: 1100, windowHeight: 900,
        });
        if ((modo === 'consolidado' ? paginasConsolidado : paginasGrupo) > 0)
          pdf.addPage('a4', 'landscape');
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 277, 190);
        canvas.width = 0;
        canvas.height = 0;
        paginasGrupo++;
        if (modo === 'consolidado') paginasConsolidado++;
      }

      for (const fila of grupo.filas) {
        let cuerpo = pagina.querySelector('tbody');
        if (!cuerpo) throw new Error('Falta la tabla del grupo.');
        const tr = doc.createElement('tr');
        tr.innerHTML = filaGrupoPDF(fila, grupo.filas[0].Tipo_Grupo);
        cuerpo.append(tr);
        if (pagina.offsetHeight > alturaPagina) {
          tr.remove();
          if (!cuerpo.children.length)
            throw new Error('Una fila es demasiado alta para la página PDF.');
          await emitirPagina();
          pagina = nuevaPagina(grupo);
          cuerpo = pagina.querySelector('tbody');
          if (!cuerpo) throw new Error('Falta la tabla de continuación.');
          cuerpo.append(tr);
          if (pagina.offsetHeight > alturaPagina)
            throw new Error('Una fila es demasiado alta para la página PDF.');
        }
      }
      await emitirPagina();
      if (zip) zip.file('Grupo_' + grupo.grupo + '.pdf', pdf.output('arraybuffer'));
    }

    if (zip) {
      progreso('Preparando archivo ZIP…');
      descargarBlob(await zip.generateAsync({
        type: 'blob', compression: 'DEFLATE',
      }), 'Plan_Cosecha_PorGrupo_' + fechaNombre + '.zip');
    } else {
      descargarBlob(consolidado.output('blob'),
        'Plan_Cosecha_Consolidado_' + fechaNombre + '.pdf');
    }
  } finally {
    iframe.remove();
  }
}
