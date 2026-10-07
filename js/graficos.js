/**
 * graficos.js — Gráficos con Chart.js.
 * Un gráfico por cada una de las 10 preguntas, paleta del proyecto,
 * tooltips con frecuencia/porcentaje y descarga PNG.
 */

import { getRespuestas } from "./dashboard.js";
import { VARIABLES, VARIABLES_POR_CLAVE } from "./catalogo.js";
import { tablaFrecuencias, tablaAgrupada } from "./frecuencias.js";
import { limpiar } from "./estadistica.js";
import { $, $all } from "./utils.js";

const PALETA = ["#642A5E", "#A952B9", "#B0BBDE", "#00408D", "#001B47"];
const instancias = new Map(); // canvasId -> Chart

function destruir(id) {
  const prev = instancias.get(id);
  if (prev) {
    prev.destroy();
    instancias.delete(id);
  }
}

function valoresDe(key) {
  return getRespuestas().map((r) => r[key]);
}

/** Crea (o reemplaza) el gráfico de una variable dentro de un contenedor. */
export function renderGrafico(key, contenedor, prefijo = "chart") {
  const def = VARIABLES_POR_CLAVE[key];
  if (!def || !contenedor) return;

  const id = `${prefijo}-${key}`;
  destruir(id);
  contenedor.innerHTML = `
    <h4>${def.preguntaTexto}</h4>
    <canvas id="${id}"></canvas>
    <div class="toolbar"><button class="btn btn-secondary" data-png="${id}">Descargar gráfico PNG</button></div>
  `;

  const canvas = document.getElementById(id);
  const config = configPara(def);
  instancias.set(id, new Chart(canvas, config));
}

function configPara(def) {
  const valores = valoresDe(def.key);

  if (def.grafico === "dona") {
    const tabla = tablaFrecuencias(valores);
    return {
      type: "doughnut",
      data: {
        labels: tabla.filas.map((f) => String(f.valor)),
        datasets: [
          {
            data: tabla.filas.map((f) => f.fi),
            backgroundColor: PALETA,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                return `${ctx.label}: ${ctx.parsed} (${((ctx.parsed / total) * 100).toFixed(2)} %)`;
              },
            },
          },
        },
      },
    };
  }

  if (def.grafico === "barras-horizontales") {
    const tabla = tablaFrecuencias(valores);
    return {
      type: "bar",
      data: {
        labels: tabla.filas.map((f) => String(f.valor)),
        datasets: [{ label: "Frecuencia", data: tabla.filas.map((f) => f.fi), backgroundColor: "#00408D" }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, title: { display: true, text: "Frecuencia" } } },
      },
    };
  }

  if (def.grafico === "histograma" && def.escala === "continua") {
    const g = tablaAgrupada(limpiar(valores));
    return {
      type: "bar",
      data: {
        labels: g.filas.map((f) => f.intervalo),
        datasets: [{ label: "Frecuencia", data: g.filas.map((f) => f.fi), backgroundColor: "#A952B9" }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: `Histograma (k=${g.clases}, amplitud=${g.amplitud.toFixed(2)})` } },
        scales: { y: { beginAtZero: true, title: { display: true, text: "Frecuencia" } } },
      },
    };
  }

  // Barras / Likert / histogramas discretos
  const tabla = tablaFrecuencias(valores);
  const etiquetas = tabla.filas.map((f) =>
    def.likert ? `${f.valor} · ${def.likert[Number(f.valor)] ?? ""}` : String(f.valor)
  );
  return {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [{ label: "Frecuencia", data: tabla.filas.map((f) => f.fi), backgroundColor: def.grafico === "likert" ? "#642A5E" : "#00408D" }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Frecuencia" } } },
    },
  };
}

/** Descarga PNG del gráfico indicado. */
export function descargarPng(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `${canvasId}.png`;
  a.click();
}

/* Delegación del botón PNG */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-png]");
  if (btn) descargarPng(btn.dataset.png);
});

/** Renderiza todos los gráficos en la sección "Gráficos". */
export function renderTodos() {
  for (const def of VARIABLES) {
    const contenedor = document.getElementById(`grafico-${def.key}`);
    if (contenedor) renderGrafico(def.key, contenedor);
  }
}

/** Inicialización perezosa: espera a que haya datos. */
function init() {
  const intentar = () => {
    if (getRespuestas().length) {
      renderTodos();
      return;
    }
    setTimeout(intentar, 500);
  };
  intentar();
}

init();
