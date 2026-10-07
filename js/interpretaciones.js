/**
 * interpretaciones.js — Textos automáticos basados exclusivamente
 * en los cálculos realizados. Sin afirmaciones causales.
 */

import "./admin.js";
import { getRespuestas } from "./dashboard.js";
import { VARIABLES } from "./catalogo.js";
import { mean, standardDeviation, coefficientVariation, detectOutliers } from "./estadistica.js";
import { tablaFrecuencias, categoriaModal } from "./frecuencias.js";
import { $, formatNumero, formatPorcentaje, toast } from "./utils.js";

const vals = (key) => getRespuestas().map((r) => r[key]).filter((v) => v !== null && v !== undefined && v !== "");

function pctDigital() {
  const xs = vals("compras_pago_digital").map(Number);
  if (!xs.length) return null;
  const total = xs.reduce((a, b) => a + b, 0);
  return (total / (xs.length * 10)) * 100;
}

export function hallazgos() {
  const datos = getRespuestas();
  const n = datos.length;
  if (!n) return ["No hay datos suficientes para generar hallazgos."];

  const items = [];
  const edadMedia = mean(vals("edad").map(Number));
  const comprasMedia = mean(vals("compras_mes").map(Number));
  const gastoMedio = mean(vals("gasto_mensual").map(Number));
  const confianzaMedia = mean(vals("confianza_pago").map(Number));
  const seguridadMedia = mean(vals("seguridad_pago").map(Number));
  const pctDig = pctDigital();

  items.push(`La muestra analizada es de ${n} respuestas.`);
  if (edadMedia !== null) items.push(`La edad promedio de los participantes fue de ${formatNumero(edadMedia)} años.`);
  if (comprasMedia !== null) items.push(`Los participantes realizan en promedio ${formatNumero(comprasMedia)} compras por Internet al mes.`);
  if (gastoMedio !== null) items.push(`El gasto mensual promedio en comercio electrónico fue de Q ${formatNumero(gastoMedio)}.`);

  const metodoTabla = tablaFrecuencias(vals("metodo_preferido"));
  const metodoModal = categoriaModal(metodoTabla)?.[0];
  if (metodoModal) {
    const fila = metodoTabla.filas.find((f) => f.valor === metodoModal);
    items.push(`El medio de pago más utilizado fue "${metodoModal}", seleccionado por el ${formatPorcentaje(fila.porcentaje)} de los participantes.`);
  }

  const factorTabla = tablaFrecuencias(vals("factor_eleccion"));
  const factorModal = categoriaModal(factorTabla)?.[0];
  if (factorModal) {
    const fila = factorTabla.filas.find((f) => f.valor === factorModal);
    items.push(`El factor principal de elección fue "${factorModal}" (${formatPorcentaje(fila.porcentaje)}).`);
  }

  if (confianzaMedia !== null) items.push(`La confianza promedio al proporcionar datos de pago fue ${formatNumero(confianzaMedia)} sobre 5.`);
  if (seguridadMedia !== null) items.push(`La percepción de seguridad promedio fue ${formatNumero(seguridadMedia)} sobre 5.`);
  if (pctDig !== null) items.push(`En promedio, el ${formatPorcentaje(pctDig)} de las compras se paga con medios digitales.`);

  // Variable con mayor dispersión (CV)
  let maxCV = -1;
  let varMaxCV = null;
  for (const v of VARIABLES.filter((x) => x.naturaleza === "cuantitativa")) {
    const cv = coefficientVariation(vals(v.key).map(Number));
    if (cv !== null && cv > maxCV) {
      maxCV = cv;
      varMaxCV = v;
    }
  }
  if (varMaxCV) items.push(`La variable con mayor dispersión relativa fue "${varMaxCV.etiqueta}" (CV = ${formatPorcentaje(maxCV)}).`);

  // Principales atípicos
  for (const v of VARIABLES.filter((x) => x.naturaleza === "cuantitativa")) {
    const at = detectOutliers(vals(v.key).map(Number));
    if (at.conteo > 0) items.push(`Se detectaron ${at.conteo} valores atípicos en "${v.etiqueta}".`);
  }

  return items.slice(0, 10);
}

export function conclusiones() {
  const datos = getRespuestas();
  if (!datos.length) return ["No hay datos suficientes para generar conclusiones."];

  const items = [];
  items.push(`Se analizaron ${datos.length} respuestas anónimas sobre comercio electrónico y medios de pago digitales.`);

  const confianza = mean(vals("confianza_pago").map(Number));
  const seguridad = mean(vals("seguridad_pago").map(Number));
  if (confianza !== null && seguridad !== null) {
    items.push(
      confianza >= 3.5 && seguridad >= 3.5
        ? "En general, los participantes perciben un nivel aceptable de confianza y seguridad al pagar por Internet."
        : "Los niveles de confianza y/o seguridad percibidos son relativamente bajos, lo que sugiere barreras para la adopción de medios de pago digitales."
    );
  }

  const metodoModal = categoriaModal(tablaFrecuencias(vals("metodo_preferido")))?.[0];
  if (metodoModal) items.push(`"${metodoModal}" es el medio de pago predominante, por lo que concentra la mayor parte de las transacciones.`);

  const factorModal = categoriaModal(tablaFrecuencias(vals("factor_eleccion")))?.[0];
  if (factorModal) items.push(`"${factorModal}" es el factor que más influye en la elección del medio de pago.`);

  const pctDig = pctDigital();
  if (pctDig !== null) {
    items.push(
      pctDig >= 60
        ? `La mayoría de las compras (${formatPorcentaje(pctDig)}) se pagan con medios digitales, evidencia de adopción extendida.`
        : `Todavía una porción importante de las compras no utiliza medios digitales (${formatPorcentaje(100 - pctDig)} en promedio no digital), lo que indica espacio para crecimiento.`
    );
  }

  return items;
}

export function recomendaciones() {
  const datos = getRespuestas();
  if (!datos.length) return ["No hay datos suficientes para generar recomendaciones."];

  const recs = [];
  const confianza = mean(vals("confianza_pago").map(Number));
  const seguridad = mean(vals("seguridad_pago").map(Number));
  const pctDig = pctDigital();

  if (confianza !== null && confianza < 3.5) recs.push("Fortalecer la comunicación de seguridad y protección al comprador en las plataformas de venta.");
  if (seguridad !== null && seguridad < 3.5) recs.push("Implementar y visibilizar medidas de seguridad (verificación 2FA, certificados SSL) para elevar la percepción de seguridad.");
  if (pctDig !== null && pctDig < 60) recs.push("Promover la adopción de medios de pago digitales mediante incentivos y educación financiera/digital.");
  recs.push("Mejorar la experiencia de compra en línea para reducir fricciones al momento de pagar.");
  recs.push("Ofrecer más de un medio de pago digital para atender las distintas preferencias detectadas.");
  recs.push("Mantener procesos transparentes de comisiones y disponibilidad, dado su peso en la elección del usuario.");

  // Deduplicar y limitar
  return [...new Set(recs)].slice(0, 6);
}

/* ---------- Render de vistas ---------- */

function renderLista(id, items, titulo) {
  const cont = $(id);
  if (!cont) return;
  cont.innerHTML = `<h3>${titulo}</h3><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

function renderHallazgos() {
  renderLista("#resumen-hallazgos", hallazgos(), "Resumen de resultados");
}

function renderConclusiones() {
  renderLista("#conclusiones-lista", conclusiones(), "Conclusiones estadísticas");
  renderLista("#recomendaciones-lista", recomendaciones(), "Recomendaciones");
}

/* Cruces de variables */
const CRUCES = [
  { a: "edad", b: "confianza_pago", tipo: "numerico" },
  { a: "edad", b: "seguridad_pago", tipo: "numerico" },
  { a: "compras_mes", b: "gasto_mensual", tipo: "numerico" },
  { a: "confianza_pago", b: "seguridad_pago", tipo: "numerico" },
  { a: "metodo_preferido", b: "seguridad_pago", tipo: "categorico" },
  { a: "metodo_preferido", b: "confianza_pago", tipo: "categorico" },
];

function renderCruces() {
  const cont = $("#cruces-contenido");
  if (!cont) return;
  const datos = getRespuestas();
  let html = "";

  for (const c of CRUCES) {
    if (c.tipo === "numerico") {
      const puntos = datos
        .map((r) => ({ x: Number(r[c.a]), y: Number(r[c.b]) }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      const idCanvas = `cruce-${c.a}-${c.b}`;
      html += `<article class="card chart-card"><h3>${c.a} vs ${c.b}</h3><canvas id="${idCanvas}"></canvas></article>`;
      setTimeout(() => {
        const ctx = document.getElementById(idCanvas);
        if (ctx) {
          new Chart(ctx, {
            type: "scatter",
            data: { datasets: [{ label: `${c.a} vs ${c.b}`, data: puntos, backgroundColor: "#A952B9" }] },
            options: { responsive: true, scales: { x: { title: { display: true, text: c.a } }, y: { title: { display: true, text: c.b } } } },
          });
        }
      }, 0);
    } else {
      const grupos = new Map();
      for (const r of datos) {
        const cat = String(r[c.a] ?? "—");
        const num = Number(r[c.b]);
        if (!grupos.has(cat)) grupos.set(cat, []);
        if (Number.isFinite(num)) grupos.get(cat).push(num);
      }
      const filas = [...grupos.entries()].map(([cat, arr]) => ({ cat, promedio: arr.length ? mean(arr) : null, n: arr.length }));
      html += `<article class="card" style="padding:1rem; overflow-x:auto"><h3>${c.a} vs ${c.b} (promedio por categoría)</h3>
        <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Categoría</th><th>Promedio</th><th>n</th></tr></thead>
        <tbody>${filas.map((f) => `<tr><td>${f.cat}</td><td>${f.promedio === null ? "—" : formatNumero(f.promedio)}</td><td>${f.n}</td></tr>`).join("")}</tbody></table></div></article>`;
    }
  }
  cont.innerHTML = html;
}

const intentar = () => {
  if (getRespuestas().length) {
    renderHallazgos();
    renderConclusiones();
    renderCruces();
    return;
  }
  setTimeout(intentar, 500);
};
intentar();
