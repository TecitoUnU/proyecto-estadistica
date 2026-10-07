/**
 * importador.js — Importación de respuestas desde CSV o XLSX.
 * Flujo: archivo → encabezados → vista previa → mapeo de columnas
 * → detección de tipos → validación → resumen → confirmación → INSERT.
 */

import "./admin.js"; // asegura el gate de autenticación
import { supabase } from "./supabase.js";
import { VARIABLES } from "./catalogo.js";
import { validarRegistro } from "./validaciones.js";
import { $, toast } from "./utils.js";

let filasCrudas = []; // array de objetos {encabezado: valor}
let encabezados = [];
let mapeo = {}; // encabezado -> clave de variable (o "")

/** Coincidencia automática de encabezados con variables del catálogo. */
function detectarMapeo(cols) {
  const sinonimos = {
    edad: ["edad", "qué edad", "que edad", "cuántos años tiene"],
    compras_mes: ["compras", "compras al mes", "compras por internet", "compras mensuales", "compras_mes"],
    gasto_mensual: ["gasto", "gasto mensual", "cuánto gasta", "cuanto gasta", "gasto_mensual"],
    anios_comprando: ["años comprando", "anos comprando", "años lleva", "tiempo comprando", "anios_comprando"],
    cantidad_metodos_pago: ["métodos de pago", "metodos de pago", "cantidad de medios", "medios de pago", "cantidad_metodos_pago"],
    seguridad_pago: ["seguridad", "qué tan seguro", "que tan seguro", "seguridad_pago"],
    confianza_pago: ["confianza", "confianza_pago", "nivel de confianza"],
    compras_pago_digital: ["pago digital", "compras_pago_digital", "de cada 10"],
    metodo_preferido: ["método", "metodo", "medio de pago principal", "metodo_preferido", "método preferido"],
    factor_eleccion: ["factor", "razón", "razon", "factor_eleccion", "principal razón"],
  };
  const resultado = {};
  for (const col of cols) {
    const norm = col.toLowerCase().trim();
    let asignada = "";
    for (const v of VARIABLES) {
      if (norm === v.key || sinonimos[v.key]?.some((s) => norm.includes(s))) {
        asignada = v.key;
        break;
      }
    }
    resultado[col] = asignada;
  }
  return resultado;
}

async function leerArchivo(file) {
  const nombre = file.name.toLowerCase();
  if (nombre.endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve({ encabezados: res.meta.fields ?? [], filas: res.data }),
        error: reject,
      });
    });
  }
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });
  const encabezados = filas.length ? Object.keys(filas[0]) : [];
  return { encabezados, filas };
}

function construirMapeoUI() {
  const cont = $("#importar-mapeo");
  cont.innerHTML = `<h3>Asociación de columnas</h3>
    <table class="data-table"><thead><tr><th>Columna del archivo</th><th>Variable del sistema</th></tr></thead>
    <tbody>${encabezados
      .map(
        (col) => `<tr><td>${col}</td><td><select data-col="${col}">
          <option value="">— No importar —</option>
          ${VARIABLES.map((v) => `<option value="${v.key}" ${mapeo[col] === v.key ? "selected" : ""}>${v.etiqueta} (${v.key})</option>`).join("")}
        </select></td></tr>`
      )
      .join("")}</tbody></table>`;
  cont.querySelectorAll("select").forEach((sel) =>
    sel.addEventListener("change", () => {
      mapeo[sel.dataset.col] = sel.value;
      analizar();
    })
  );
}

function filaARegistro(fila) {
  const datos = {};
  for (const col of encabezados) {
    const key = mapeo[col];
    if (key) datos[key] = fila[col];
  }
  return datos;
}

function analizar() {
  const validas = [];
  const invalidas = [];
  const vacias = [];
  const firmas = new Set();
  let duplicados = 0;

  for (const fila of filasCrudas) {
    const datos = filaARegistro(fila);
    const faltantes = VARIABLES.filter((v) => datos[v.key] === undefined || datos[v.key] === "");
    if (faltantes.length) vacias.push({ fila, faltantes: faltantes.map((v) => v.key) });

    const { valido, valores } = validarRegistro(datos);
    if (valido) {
      const firma = JSON.stringify(valores);
      if (firmas.has(firma)) duplicados++;
      firmas.add(firma);
      validas.push(valores);
    } else {
      invalidas.push({ fila, datos });
    }
  }

  $("#importar-resumen").innerHTML = `
    <h3>Resumen</h3>
    <ul>
      <li>Registros encontrados: <strong>${filasCrudas.length}</strong></li>
      <li>Registros válidos: <strong>${validas.length}</strong></li>
      <li>Registros inválidos: <strong>${invalidas.length}</strong></li>
      <li>Campos vacíos: <strong>${vacias.length}</strong> filas con datos faltantes</li>
      <li>Duplicados detectados: <strong>${duplicados}</strong></li>
    </ul>`;

  $("#importar-preview").innerHTML = `<h3>Vista previa (primeras 10 filas)</h3>
    <div class="data-table-wrap"><table class="data-table"><thead><tr>${encabezados
      .map((c) => `<th>${c}</th>`)
      .join("")}</tr></thead><tbody>${filasCrudas
      .slice(0, 10)
      .map((f) => `<tr>${encabezados.map((c) => `<td>${f[c] ?? ""}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></div>`;

  $("#btn-importar").disabled = validas.length === 0;
  $("#btn-importar").dataset.count = String(validas.length);
  $("#btn-importar").dataset.validas = JSON.stringify(validas);
}

$("#archivo-importar").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  $("#importar-estado").textContent = "Leyendo archivo…";
  try {
    const leido = await leerArchivo(file);
    encabezados = leido.encabezados;
    filasCrudas = leido.filas;
    mapeo = detectarMapeo(encabezados);
    construirMapeoUI();
    analizar();
    $("#importar-estado").textContent = `${filasCrudas.length} registros encontrados.`;
  } catch (error) {
    console.error(error);
    $("#importar-estado").textContent = "No se pudo leer el archivo.";
  }
});

$("#btn-importar").addEventListener("click", async () => {
  const validas = JSON.parse($("#btn-importar").dataset.validas ?? "[]");
  if (!validas.length) return;
  if (!confirm(`Se insertarán ${validas.length} registros. ¿Confirmar?`)) return;

  const { error } = await supabase.from("respuestas").insert(validas);
  if (error) {
    console.error(error);
    toast("Error al importar los registros.");
    return;
  }
  toast(`Archivo importado correctamente: ${validas.length} registros.`);
  $("#btn-importar").disabled = true;
});
