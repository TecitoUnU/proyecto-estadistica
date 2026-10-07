/**
 * calidad.js — Calidad de datos: detección de incidencias,
 * exclusión temporal, restauración y log de limpieza.
 */

import "./admin.js";
import { supabase } from "./supabase.js";
import { getRespuestas } from "./dashboard.js";
import { VARIABLES } from "./catalogo.js";
import { detectOutliers } from "./estadistica.js";
import { $, toast } from "./utils.js";

/* utils doesn't export numeroAmigable — build simple */
function idxDe(respuestas, id) {
  return respuestas.findIndex((r) => r.id === id);
}

function analizar() {
  const respuestas = getRespuestas();
  const incidencias = [];
  const firmas = new Map();

  respuestas.forEach((r, i) => {
    const num = `#${String(i + 1).padStart(3, "0")}`;
    const firma = VARIABLES.map((v) => String(r[v.key] ?? "")).join("|");
    firmas.set(firma, (firmas.get(firma) ?? 0) + 1);

    for (const v of VARIABLES) {
      const valor = r[v.key];
      if (valor === null || valor === undefined || valor === "") {
        incidencias.push({ id: r.id, num, variable: v.key, valor: "—", problema: "Dato faltante", accion: "Completar o excluir" });
        continue;
      }
      if (v.naturaleza === "cuantitativa") {
        const n = Number(valor);
        if (Number.isNaN(n)) {
          incidencias.push({ id: r.id, num, variable: v.key, valor, problema: "Texto donde debería existir un número", accion: "Corregir o excluir" });
        } else if (n < v.min || n > v.max) {
          incidencias.push({ id: r.id, num, variable: v.key, valor, problema: `Fuera de rango (${v.min}–${v.max})`, accion: "Revisar" });
        }
      } else if (v.categorias && !v.categorias.includes(String(valor))) {
        incidencias.push({ id: r.id, num, variable: v.key, valor, problema: "Categoría no válida", accion: "Revisar" });
      }
    }
  });

  // Duplicados
  const firmasConteo = new Map();
  for (const r of respuestas) {
    const f = VARIABLES.map((v) => String(r[v.key] ?? "")).join("|");
    firmasConteo.set(f, (firmasConteo.get(f) ?? 0) + 1);
  }
  respuestas.forEach((r, i) => {
    const f = VARIABLES.map((v) => String(r[v.key] ?? "")).join("|");
    if ((firmasConteo.get(f) ?? 0) > 1) {
      incidencias.push({ id: r.id, num: `#${String(i + 1).padStart(3, "0")}`, variable: "—", valor: "—", problema: "Posible duplicado", accion: "Excluir o eliminar" });
    }
  });

  // Atípicos por variable cuantitativa
  for (const v of VARIABLES.filter((x) => x.naturaleza === "cuantitativa")) {
    const xs = respuestas.map((r) => Number(r[v.key])).filter(Number.isFinite);
    const ats = detectOutliers(xs);
    for (const val of ats.valores) {
      const r = respuestas.find((x) => Number(x[v.key]) === val);
      if (r) {
        incidencias.push({
          id: r.id,
          num: `#${String(idxDe(respuestas, r.id) + 1).padStart(3, "0")}`,
          variable: v.key,
          valor: val,
          problema: "Valor atípico (Tukey)",
          accion: "Revisar",
        });
      }
    }
  }

  return { respuestas, incidencias };
}

async function registrarLog({ response_id, action, variable = null, old_value = null, new_value = null, reason }) {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("data_cleaning_log").insert({
      response_id,
      action,
      variable,
      old_value,
      new_value,
      reason,
      admin_id: data?.user?.id ?? null,
    });
  } catch (e) {
    console.warn("No se pudo registrar en el log", e);
  }
}

async function excluir(id) {
  const r = getRespuestas().find((x) => x.id === id);
  await supabase.from("respuestas").update({ excluded_from_analysis: true }).eq("id", id);
  await registrarLog({ response_id: id, action: "exclude", reason: "Excluido del análisis" });
  if (r) r.excluded_from_analysis = true;
  toast("Registro excluido del análisis.");
  render();
}

async function restaurar(id) {
  const r = getRespuestas().find((x) => x.id === id);
  await supabase.from("respuestas").update({ excluded_from_analysis: false }).eq("id", id);
  await registrarLog({ response_id: id, action: "restore", reason: "Restaurado al análisis" });
  if (r) r.excluded_from_analysis = false;
  toast("Registro restaurado.");
  render();
}

async function eliminar(id) {
  if (!confirm("¿Eliminar definitivamente este registro?")) return;
  await supabase.from("respuestas").delete().eq("id", id);
  await registrarLog({ response_id: id, action: "delete", reason: "Eliminado por calidad de datos" });
  toast("Registro eliminado.");
  location.reload();
}

export function render() {
  const cont = $("#calidad-contenido");
  if (!cont) return;
  const { respuestas, incidencias } = analizar();
  const completos = respuestas.filter((r) =>
    VARIABLES.every((v) => r[v.key] !== null && r[v.key] !== undefined && r[v.key] !== "")
  ).length;
  const faltantes = incidencias.filter((i) => i.problema === "Dato faltante").length;
  const duplicados = incidencias.filter((i) => i.problema === "Posible duplicado").length;
  const atipicos = incidencias.filter((i) => i.problema === "Valor atípico (Tukey)").length;
  const errores = incidencias.filter((i) => i.problema.includes("rango") || i.problema.includes("número") || i.problema.includes("Categoría")).length;

  cont.innerHTML = `
    <div class="kpi-grid">
      <article class="card kpi"><h2>Datos completos</h2><p>${completos}</p></article>
      <article class="card kpi"><h2>Datos faltantes</h2><p>${faltantes}</p></article>
      <article class="card kpi"><h2>Posibles duplicados</h2><p>${duplicados}</p></article>
      <article class="card kpi"><h2>Valores atípicos</h2><p>${atipicos}</p></article>
      <article class="card kpi"><h2>Errores detectados</h2><p>${errores}</p></article>
    </div>
    <h3>Incidencias</h3>
    <div class="data-table-wrap">
      <table class="data-table">
        <thead><tr><th>Registro</th><th>Variable</th><th>Valor</th><th>Problema</th><th>Acción recomendada</th><th>Acciones</th></tr></thead>
        <tbody>
          ${incidencias
            .map(
              (i) => `<tr>
            <td>${i.num}</td><td>${i.variable}</td><td>${i.valor}</td><td>${i.problema}</td><td>${i.accion}</td>
            <td>
              <button class="btn btn-secondary" data-excluir="${i.id}">Excluir</button>
              <button class="btn btn-secondary" data-restaurar="${i.id}">Restaurar</button>
              <button class="btn btn-secondary" data-eliminar="${i.id}">Eliminar</button>
            </td></tr>`
            )
            .join("") || `<tr><td colspan="6" class="empty-state">Sin incidencias detectadas.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  cont.querySelectorAll("[data-excluir]").forEach((b) => b.addEventListener("click", () => excluir(b.dataset.excluir)));
  cont.querySelectorAll("[data-restaurar]").forEach((b) => b.addEventListener("click", () => restaurar(b.dataset.restaurar)));
  cont.querySelectorAll("[data-eliminar]").forEach((b) => b.addEventListener("click", () => eliminar(b.dataset.eliminar)));
}

/* Inicialización cuando existan datos */
const intentar = () => {
  if ($("#calidad-contenido") && getRespuestas().length) render();
  else setTimeout(intentar, 500);
};
intentar();
