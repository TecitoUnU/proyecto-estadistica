/**
 * estadisticas.js — Vista "Estadísticas": medidas globales por variable,
 * con selector de fórmula de varianza (muestra / población).
 */

import "./admin.js";
import { getRespuestas } from "./dashboard.js";
import { VARIABLES } from "./catalogo.js";
import { resumenCuantitativo, interpretarForma } from "./estadistica.js";
import { $, formatNumero, formatPorcentaje } from "./utils.js";

let tipo = localStorage.getItem("tipo_varianza") || "muestra";

function fmt(v, dec = 2) {
  return v === null || v === undefined ? "—" : formatNumero(v, dec);
}

function render() {
  const cont = $("#estadisticas-contenido");
  if (!cont) return;
  const datos = getRespuestas();

  const filas = VARIABLES.filter((v) => v.naturaleza === "cuantitativa")
    .map((v) => {
      const xs = datos.map((r) => r[v.key]).filter((x) => x !== null && x !== undefined && x !== "");
      const r = resumenCuantitativo(xs, tipo);
      const forma = interpretarForma(r.asimetria, r.curtosis);
      return { v, r, forma };
    })
    .map(
      ({ v, r, forma }) => `<tr>
      <td>${v.etiqueta}</td>
      <td>${r.n}</td>
      <td>${fmt(r.media)}</td>
      <td>${fmt(r.mediana)}</td>
      <td>${r.moda.length ? r.moda.map((m) => fmt(m)).join(", ") : "Sin moda representativa"}</td>
      <td>${fmt(r.rango)}</td>
      <td>${fmt(r.varianza)}</td>
      <td>${fmt(r.desviacion)}</td>
      <td>${r.cv === null ? "No definido" : formatPorcentaje(r.cv)}</td>
      <td>${fmt(r.ric)}</td>
      <td>${fmt(r.q1)} / ${fmt(r.q2)} / ${fmt(r.q3)}</td>
      <td>${fmt(r.asimetria, 3)} (${forma.asimetria})</td>
      <td>${fmt(r.curtosis, 3)} (${forma.curtosis})</td>
      <td>${r.atipicos.conteo}</td>
    </tr>`
    )
    .join("");

  cont.innerHTML = `
    <p>Fórmula de varianza utilizada: <strong>${tipo === "muestra" ? "Muestra (s², n − 1)" : "Población (σ², n)"}</strong>.
    La desviación estándar se calcula con la misma opción. Los percentiles usan interpolación lineal (PERCENTILE.INC).</p>
    <div class="data-table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Variable</th><th>n</th><th>Media</th><th>Mediana</th><th>Moda</th>
          <th>Rango</th><th>Varianza</th><th>DE</th><th>CV</th><th>RIC</th>
          <th>Q1/Q2/Q3</th><th>Asimetría</th><th>Curtosis (exceso)</th><th>Atípicos</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <h3>Interpretación por variable</h3>
    ${VARIABLES.filter((v) => v.naturaleza === "cuantitativa")
      .map((v) => {
        const r = resumenCuantitativo(
          datos.map((x) => x[v.key]).filter((x) => x !== null && x !== undefined && x !== ""),
          tipo
        );
        const cvTxt = r.cv === null ? "no definido" : `${formatPorcentaje(r.cv)}`;
        return `<p><strong>${v.etiqueta}:</strong> promedio ${fmt(r.media)}, mediana ${fmt(r.mediana)}, CV ${cvTxt}, ${r.atipicos.conteo} atípicos.</p>`;
      })
      .join("")}
  `;
}

export function getTipoVarianza() {
  return tipo;
}

// Radios de muestra/población
document.querySelectorAll('input[name="tipo-var"]').forEach((r) => {
  r.checked = r.value === tipo;
  r.addEventListener("change", () => {
    tipo = r.value;
    localStorage.setItem("tipo_varianza", tipo);
    const cfg = $("#cfg-varianza");
    if (cfg) cfg.textContent = tipo === "muestra" ? "Muestra (n − 1)" : "Población (n)";
    render();
  });
});
const cfgInicial = $("#cfg-varianza");
if (cfgInicial) cfgInicial.textContent = tipo === "muestra" ? "Muestra (n − 1)" : "Población (n)";

const intentar = () => {
  if (getRespuestas().length) {
    render();
    return;
  }
  setTimeout(intentar, 500);
};
intentar();
