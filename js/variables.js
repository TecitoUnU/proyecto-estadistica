/**
 * variables.js — Vista "Variables": panel individual por variable con
 * tabla de frecuencias, medidas estadísticas, forma y datos agrupados.
 */

import { getRespuestas } from "./dashboard.js";
import { VARIABLES, VARIABLES_POR_CLAVE } from "./catalogo.js";
import { tablaFrecuencias, tablaAgrupada, categoriaModal, clasesSturges } from "./frecuencias.js";
import { resumenCuantitativo, interpretarForma } from "./estadistica.js";
import { renderGrafico } from "./graficos.js";
import { $, formatNumero, formatPorcentaje } from "./utils.js";

function incrustarGrafico(key) {
  const cont = document.getElementById("var-grafico");
  if (cont) renderGrafico(key, cont, "var");
}

let tipoVarianza = localStorage.getItem("tipo_varianza") || "muestra";

function fmt(v, dec = 2) {
  return v === null || v === undefined ? "—" : formatNumero(v, dec);
}

function tablaHtml(filas, columnas) {
  const head = columnas.map((c) => `<th>${c.titulo}</th>`).join("");
  const body = filas
    .map((f) => `<tr>${columnas.map((c) => `<td>${c.valor(f)}</td>`).join("")}</tr>`)
    .join("");
  return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderSimple(valores, def) {
  const tabla = tablaFrecuencias(valores);
  const modal = categoriaModal(tabla);
  const cols = [
    { titulo: "Valor", valor: (f) => f.valor },
    { titulo: "fi", valor: (f) => f.fi },
    { titulo: "Fi", valor: (f) => f.Fi },
    { titulo: "hi", valor: (f) => formatNumero(f.hi, 4) },
    { titulo: "%", valor: (f) => formatPorcentaje(f.porcentaje) },
    { titulo: "% acum.", valor: (f) => formatPorcentaje(f.pctAcumulado) },
  ];

  $("#var-contenido").innerHTML = `
    <h3>${def.etiqueta}</h3>
    <p>${def.preguntaTexto} · n = ${tabla.n}</p>
    <h4>Tabla de frecuencias</h4>
    ${tablaHtml(tabla.filas, cols)}
    <p><strong>Categoría modal:</strong> ${modal && modal.length ? modal.join(", ") : "—"}</p>
    <p><strong>Cantidad de categorías:</strong> ${tabla.filas.length}</p>
    <p>${
      def.naturaleza === "cualitativa"
        ? `El valor más frecuente fue “${modal?.[0] ?? "—"}”. No se calculan media ni desviación estándar para variables nominales.`
        : ""
    }</p>
    <div id="var-grafico" class="chart-card card" style="margin-top:1rem"></div>
  `;
  incrustarGrafico(def.key);
}

function renderCualitativa(valores, def) {
  renderSimple(valores, def);
}

function renderCuantitativa(valores, def) {
  const xs = valores.filter((v) => v !== null && v !== undefined && v !== "").map(Number);
  const resumen = resumenCuantitativo(xs, tipoVarianza);
  const forma = interpretarForma(resumen.asimetria, resumen.curtosis);
  const tabla = tablaFrecuencias(xs);

  const soloModal =
    resumen.moda.length === 0
      ? "No existe una moda representativa."
      : resumen.moda.length > 1
        ? `Modas múltiples: ${resumen.moda.join(", ")}`
        : `Moda: ${resumen.moda[0]}`;

  $("#var-contenido").innerHTML = `
    <h3>${def.etiqueta}</h3>
    <p>${def.preguntaTexto} · n = ${resumen.n}</p>

    <h4>Tabla de frecuencias</h4>
    ${tablaHtml(tabla.filas, [
      { titulo: "Valor", valor: (f) => f.valor },
      { titulo: "fi", valor: (f) => f.fi },
      { titulo: "Fi", valor: (f) => f.Fi },
      { titulo: "hi", valor: (f) => formatNumero(f.hi, 4) },
      { titulo: "%", valor: (f) => formatPorcentaje(f.porcentaje) },
      { titulo: "% acum.", valor: (f) => formatPorcentaje(f.pctAcumulado) },
    ])}

    <div class="toolbar">
      <button class="btn btn-secondary" id="btn-agrupar">Agrupar datos</button>
      <span id="var-agrupada"></span>
    </div>

    <h4>Tendencia central</h4>
    <p>Media: <strong>${fmt(resumen.media)}</strong> · Mediana: <strong>${fmt(resumen.mediana)}</strong> · ${soloModal}</p>

    <h4>Variabilidad (fórmula: ${tipoVarianza === "muestra" ? "muestra, n − 1" : "población, n"})</h4>
    <p>Rango: ${fmt(resumen.rango)} · Varianza: ${fmt(resumen.varianza)} · Desv. estándar: ${fmt(resumen.desviacion)}
       · CV: ${resumen.cv === null ? "No definido" : formatPorcentaje(resumen.cv)} · RIC: ${fmt(resumen.ric)}</p>

    <h4>Posición</h4>
    <p>Mín ${fmt(resumen.minimo)} · Q1 ${fmt(resumen.q1)} · Q2 ${fmt(resumen.q2)} · Q3 ${fmt(resumen.q3)} · Máx ${fmt(resumen.maximo)}
       · P10 ${fmt(resumen.p10)} · P25 ${fmt(resumen.p25)} · P50 ${fmt(resumen.p50)} · P75 ${fmt(resumen.p75)} · P90 ${fmt(resumen.p90)}</p>

    <h4>Forma</h4>
    <p>Asimetría: ${fmt(resumen.asimetria, 3)} → ${forma.asimetria}<br/>
       Curtosis (exceso): ${fmt(resumen.curtosis, 3)} → ${forma.curtosis}</p>

    <h4>Valores atípicos</h4>
    <p>${resumen.atipicos.conteo} detectados${
      resumen.atipicos.conteo
        ? `: ${resumen.atipicos.valores.map((v) => fmt(v)).join(", ")} (límites ${fmt(resumen.atipicos.limites?.inferior)} a ${fmt(resumen.atipicos.limites?.superior)})`
        : "."
    }</p>
    <div id="var-grafico" class="chart-card card" style="margin-top:1rem"></div>
  `;
  incrustarGrafico(def.key);

  $("#btn-agrupar").addEventListener("click", () => {
    const sugeridas = clasesSturges(xs.length);
    const respuesta = prompt(`Número de intervalos (sugerido por Sturges: ${sugeridas}):`, String(sugeridas));
    if (respuesta === null) return;
    const k = Number(respuesta);
    if (!Number.isInteger(k) || k < 1) return;
    renderAgrupada(xs, def, k);
  });
}

function renderAgrupada(xs, def, k) {
  const g = tablaAgrupada(xs, k);
  $("#var-agrupada").innerHTML = `
    <h4>Datos agrupados (k = ${g.clases}, amplitud = ${formatNumero(g.amplitud, 2)})</h4>
    ${tablaHtml(g.filas, [
      { titulo: "Intervalo", valor: (f) => f.intervalo },
      { titulo: "Marca de clase", valor: (f) => formatNumero(f.marca, 2) },
      { titulo: "fi", valor: (f) => f.fi },
      { titulo: "Fi", valor: (f) => f.Fi },
      { titulo: "hi", valor: (f) => formatNumero(f.hi, 4) },
      { titulo: "Hi", valor: (f) => formatNumero(f.Hi, 4) },
      { titulo: "%", valor: (f) => formatPorcentaje(f.porcentaje) },
    ])}
  `;
}

export function renderVariable(key) {
  const def = VARIABLES_POR_CLAVE[key];
  if (!def) return;
  const valores = getRespuestas().map((r) => r[key]);
  if (def.naturaleza === "cualitativa") renderCualitativa(valores, def);
  else renderCuantitativa(valores, def);
}

/* Inicialización */
const sel = $("#var-select");
if (sel) {
  for (const v of VARIABLES) {
    const op = document.createElement("option");
    op.value = v.key;
    op.textContent = `${v.pregunta}. ${v.etiqueta}`;
    sel.append(op);
  }
  sel.addEventListener("change", () => renderVariable(sel.value));
  // Render inicial cuando haya datos
  const probar = () => {
    if (getRespuestas().length) renderVariable(sel.value);
    else setTimeout(probar, 300);
  };
  probar();
}

export function setTipoVarianza(tipo) {
  tipoVarianza = tipo;
  const actual = sel?.value;
  if (actual) renderVariable(actual);
}
