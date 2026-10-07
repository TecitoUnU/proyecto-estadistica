/**
 * dashboard.js — Carga de datos y vistas Resumen + Respuestas.
 * Importa admin.js para asegurar que el gate de autenticación
 * se ejecute antes que cualquier carga de datos.
 */

import { acceso } from "./admin.js";
import { supabase } from "./supabase.js";
import { VARIABLES } from "./catalogo.js";
import { $, $all, formatNumero, toast } from "./utils.js";
import { APP } from "./config.js";

if (!acceso) {
  // admin.js ya redirige; no cargar nada.
  throw new Error("Sin acceso");
}

const CAMPOS_FECHA = "created_at";
let respuestas = []; // arreglos crudos ordenados por created_at
let estado = { orden: "created_at", dir: 1, pagina: 1, filas: 10, soloDup: false };

/** Acceso de lectura para otros módulos (vista de variables, etc.). */
export function getRespuestas() {
  return respuestas;
}

/* ---------- Carga de datos ---------- */

async function cargarRespuestas() {
  const { data, error } = await supabase
    .from("respuestas")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  respuestas = data ?? [];
}

const numeroAmigable = (indice) => `#${String(indice + 1).padStart(3, "0")}`;

function firma(r) {
  return VARIABLES.map((v) => String(r[v.key] ?? "")).join("|");
}

function mapaDuplicados() {
  const conteo = new Map();
  for (const r of respuestas) {
    const f = firma(r);
    conteo.set(f, (conteo.get(f) ?? 0) + 1);
  }
  return conteo;
}

/* ---------- Resumen (KPIs) ---------- */

function renderResumen() {
  const total = respuestas.length;
  const sinDato = respuestas.filter((r) =>
    VARIABLES.some((v) => r[v.key] === null || r[v.key] === undefined || r[v.key] === "")
  );
  const invalidas = respuestas.filter(
    (r) =>
      VARIABLES.some(
        (v) =>
          (v.naturaleza === "cuantitativa" && Number.isNaN(Number(r[v.key]))) ||
          (v.naturaleza === "cuantitativa" && Number(r[v.key]) < v.min) ||
          (v.naturaleza === "cuantitativa" && Number(r[v.key]) > v.max)
      )
  );

  $("#kpi-total").textContent = String(total);
  $("#kpi-validas").textContent = String(total - invalidas.length);
  $("#kpi-errores").textContent = String(invalidas.length);
  $("#kpi-faltantes").textContent = String(sinDato.length);

  const ultima = total ? new Date(respuestas[total - 1][CAMPOS_FECHA]) : null;
  const primera = total ? new Date(respuestas[0][CAMPOS_FECHA]) : null;
  $("#kpi-ultima").textContent = ultima ? ultima.toLocaleString("es-GT") : "—";
  $("#fecha-primera").textContent = primera ? primera.toLocaleString("es-GT") : "—";
  $("#fecha-ultima").textContent = ultima ? ultima.toLocaleString("es-GT") : "—";
  $("#kpi-progreso").textContent = `${total} / ${APP.sampleMax}`;

  const estadoMuestra =
    total < APP.sampleMin
      ? "Muestra todavía insuficiente"
      : total <= APP.sampleMax
        ? "Muestra dentro del rango requerido"
        : "Se superó el tamaño previsto de la muestra";
  $("#muestra-estado").textContent = estadoMuestra;
  const pct = Math.min(100, (total / APP.sampleMax) * 100);
  $("#muestra-fill").style.width = `${pct}%`;
}

/* ---------- Tabla de respuestas ---------- */

function filtrar() {
  const texto = ($("#filtro-busqueda").value ?? "").toLowerCase();
  const variable = $("#filtro-variable").value;
  const valor = ($("#filtro-valor").value ?? "").toLowerCase();
  const desde = $("#filtro-desde").value;
  const hasta = $("#filtro-hasta").value;
  const duplicados = mapaDuplicados();

  return respuestas.filter((r, i) => {
    if (estado.soloDup && (duplicados.get(firma(r)) ?? 0) < 2) return false;

    const fecha = new Date(r.created_at);
    if (desde && fecha < new Date(`${desde}T00:00:00`)) return false;
    if (hasta && fecha > new Date(`${hasta}T23:59:59`)) return false;

    if (variable && valor && !String(r[variable] ?? "").toLowerCase().includes(valor)) return false;

    if (texto) {
      const volcado = [numeroAmigable(i), ...VARIABLES.map((v) => r[v.key]), r.created_at]
        .join(" ")
        .toLowerCase();
      if (!volcado.includes(texto)) return false;
    }
    return true;
  });
}

function ordenar(lista, indicePorId) {
  const { orden, dir } = estado;
  return [...lista].sort((a, b) => {
    let va = a[orden];
    let vb = b[orden];
    if (orden === "numero") {
      va = indicePorId.get(a.id);
      vb = indicePorId.get(b.id);
    } else if (["edad", "compras_mes", "gasto_mensual", "seguridad_pago", "confianza_pago"].includes(orden)) {
      va = Number(va);
      vb = Number(vb);
    } else if (orden === "created_at") {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    } else {
      va = String(va ?? "").toLowerCase();
      vb = String(vb ?? "").toLowerCase();
    }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

function renderTabla() {
  const indicePorId = new Map(respuestas.map((r, i) => [r.id, i]));
  const filtrados = ordenar(filtrar(), indicePorId);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / estado.filas));
  estado.pagina = Math.min(estado.pagina, totalPaginas);

  const inicio = (estado.pagina - 1) * estado.filas;
  const pagina = filtrados.slice(inicio, inicio + estado.filas);

  const tbody = $("#tabla-body");
  tbody.innerHTML = "";

  if (!pagina.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No hay registros que coincidan.</td></tr>`;
  }

  for (const r of pagina) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${numeroAmigable(indicePorId.get(r.id))}</td>
      <td>${new Date(r.created_at).toLocaleDateString("es-GT")}</td>
      <td>${r.edad}</td>
      <td>${r.compras_mes}</td>
      <td>Q ${formatNumero(r.gasto_mensual, 2)}</td>
      <td>${r.metodo_preferido}</td>
      <td>${r.seguridad_pago}</td>
      <td>${r.confianza_pago}</td>
      <td>
        <button class="btn btn-secondary" data-accion="ver" data-id="${r.id}">Ver</button>
        <button class="btn btn-secondary" data-accion="eliminar" data-id="${r.id}">Eliminar</button>
      </td>`;
    tbody.append(tr);
  }

  $("#pag-info").textContent = `Página ${estado.pagina} de ${totalPaginas} · ${filtrados.length} registros`;
  $("#pag-anterior").disabled = estado.pagina <= 1;
  $("#pag-siguiente").disabled = estado.pagina >= totalPaginas;
}

/* ---------- Detalle y eliminación ---------- */

function verDetalle(id) {
  const r = respuestas.find((x) => x.id === id);
  if (!r) return;
  const dl = $("#detalle-contenido");
  dl.innerHTML = "";
  for (const v of VARIABLES) {
    const dt = document.createElement("dt");
    dt.textContent = v.preguntaTexto;
    const dd = document.createElement("dd");
    dd.textContent = r[v.key] === null || r[v.key] === undefined ? "—" : String(r[v.key]);
    dl.append(dt, dd);
  }
  const fecha = document.createElement("dd");
  fecha.textContent = new Date(r.created_at).toLocaleString("es-GT");
  dl.append(Object.assign(document.createElement("dt"), { textContent: "Fecha de registro" }), fecha);
  $("#modal-detalle").showModal();
}

async function eliminar(id) {
  if (!confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) return;
  const { error } = await supabase.from("respuestas").delete().eq("id", id);
  if (error) {
    toast("No se pudo eliminar el registro.");
    return;
  }
  // Registrar en el log de limpieza (si la tabla existe)
  try {
    await supabase.from("data_cleaning_log").insert({
      response_id: id,
      action: "delete",
      reason: "Eliminado desde el panel",
      admin_id: acceso.session.user.id,
    });
  } catch {
    /* el log es complementario */
  }
  respuestas = respuestas.filter((r) => r.id !== id);
  renderResumen();
  renderTabla();
  toast("Registro eliminado.");
}

/* ---------- Eventos ---------- */

$("#tabla-body").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-accion]");
  if (!btn) return;
  if (btn.dataset.accion === "ver") verDetalle(btn.dataset.id);
  if (btn.dataset.accion === "eliminar") eliminar(btn.dataset.id);
});

$("#detalle-cerrar").addEventListener("click", () => $("#modal-detalle").close());

for (const id of ["filtro-busqueda", "filtro-variable", "filtro-valor", "filtro-desde", "filtro-hasta", "solo-duplicados"]) {
  $(`#${id}`).addEventListener("input", () => {
    estado.pagina = 1;
    renderTabla();
  });
  $(`#${id}`).addEventListener("change", () => {
    estado.pagina = 1;
    renderTabla();
  });
}

$("#filas-por-pagina").addEventListener("change", (e) => {
  estado.filas = Number(e.target.value);
  estado.pagina = 1;
  renderTabla();
});

$("#pag-anterior").addEventListener("click", () => {
  estado.pagina -= 1;
  renderTabla();
});
$("#pag-siguiente").addEventListener("click", () => {
  estado.pagina += 1;
  renderTabla();
});

for (const th of $all("#tabla-respuestas th[data-sort]")) {
  th.addEventListener("click", () => {
    const campo = th.dataset.sort;
    estado.dir = estado.orden === campo ? estado.dir * -1 : 1;
    estado.orden = campo;
    renderTabla();
  });
}

/* ---------- Inicio ---------- */

(async function init() {
  const sel = $("#filtro-variable");
  for (const v of VARIABLES) {
    const op = document.createElement("option");
    op.value = v.key;
    op.textContent = v.etiqueta;
    sel.append(op);
  }

  try {
    await cargarRespuestas();
    renderResumen();
    renderTabla();
    toast(`${respuestas.length} registros procesados.`);
  } catch (error) {
    console.error(error);
    toast("No se pudieron cargar las respuestas.");
  }
})();
