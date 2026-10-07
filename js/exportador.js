/**
 * exportador.js — Exportación: CSV, Excel, PNG de gráficos,
 * impresión del resumen y reporte estadístico.
 */

import "./admin.js";
import { getRespuestas } from "./dashboard.js";
import { VARIABLES } from "./catalogo.js";
import { hallazgos, conclusiones, recomendaciones } from "./interpretaciones.js";
import { $, $all, toast } from "./utils.js";

function filasLimpias() {
  return getRespuestas()
    .filter((r) => !r.excluded_from_analysis)
    .map((r, i) => {
      const fila = { numero: i + 1, fecha: new Date(r.created_at).toISOString() };
      for (const v of VARIABLES) fila[v.key] = r[v.key];
      return fila;
    });
}

function descargar(contenido, nombre, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportarCSV() {
  const filas = filasLimpias();
  if (!filas.length) return toast("No hay datos para exportar.");
  const cols = Object.keys(filas[0]);
  const escapar = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(",")]
    .concat(filas.map((f) => cols.map((c) => escapar(f[c])).join(",")))
    .join("\n");
  descargar(csv, "datos_limpios.csv", "text/csv;charset=utf-8");
  toast("CSV exportado.");
}

function exportarXLSX() {
  const filas = filasLimpias();
  if (!filas.length) return toast("No hay datos para exportar.");
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Respuestas");
  XLSX.writeFile(wb, "datos_limpios.xlsx");
  toast("Excel exportado.");
}

function exportarPNGs() {
  const canvases = $all("canvas");
  if (!canvases.length) return toast("No hay gráficos generados.");
  canvases.forEach((c, i) => {
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `grafico_${i + 1}.png`;
    a.click();
  });
  toast("Gráficos descargados.");
}

function imprimir() {
  const reporte = document.createElement("section");
  reporte.id = "reporte-print";
  reporte.innerHTML = `
    <h1>Reporte estadístico</h1>
    <p><strong>Tema:</strong> Comercio electrónico y medios de pago digitales</p>
    <p><strong>Tamaño de muestra:</strong> ${getRespuestas().filter((r) => !r.excluded_from_analysis).length} respuestas</p>
    <h2>Hallazgos</h2><ul>${hallazgos().map((h) => `<li>${h}</li>`).join("")}</ul>
    <h2>Conclusiones</h2><ul>${conclusiones().map((c) => `<li>${c}</li>`).join("")}</ul>
    <h2>Recomendaciones</h2><ul>${recomendaciones().map((r) => `<li>${r}</li>`).join("")}</ul>
    <p><em>Las tablas de frecuencias, gráficos, medidas estadísticas e interpretaciones por variable se encuentran en las vistas correspondientes del panel.</em></p>
  `;
  document.querySelector(".admin-main").append(reporte);
  const previos = $all("[data-view-panel]").map((p) => ({ p, h: p.hidden }));
  $all("[data-view-panel]").forEach((p) => (p.hidden = true));
  window.print();
  reporte.remove();
  previos.forEach(({ p, h }) => (p.hidden = h));
}

$("#exp-csv")?.addEventListener("click", exportarCSV);
$("#exp-xlsx")?.addEventListener("click", exportarXLSX);
$("#exp-png")?.addEventListener("click", exportarPNGs);
$("#exp-imprimir")?.addEventListener("click", imprimir);
