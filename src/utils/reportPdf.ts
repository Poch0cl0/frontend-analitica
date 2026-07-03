import { exportarReportePaciente } from '../services/api';

/** Mismo PDF que se adjunta al correo (reporte predicción). */
export async function fetchPrediccionReportPdf(pacienteId: number): Promise<Blob> {
  return exportarReportePaciente(pacienteId, 'pdf', 'prediccion');
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Abre el PDF en una pestaña y lanza el diálogo de impresión del navegador. */
export function printPdfBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('Permita ventanas emergentes para imprimir el reporte.');
  }
  const tryPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* el visor PDF del navegador puede no estar listo aún */
    }
  };
  win.addEventListener('load', tryPrint);
  setTimeout(tryPrint, 800);
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
