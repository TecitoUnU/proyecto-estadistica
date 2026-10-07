/**
 * encuesta.js
 * Lógica del wizard de la encuesta:
 * - navegación por pasos con barra de progreso
 * - validación antes de avanzar
 * - revisión antes del envío
 * - inserción en Supabase (solo INSERT con anon key; RLS lo permite)
 * - anti-doble-envío con localStorage
 */

import { supabase } from "./supabase.js";
import { VARIABLES, VARIABLES_POR_CLAVE, WIZARD_PASOS } from "./catalogo.js";
import { validarValor, validarRegistro } from "./validaciones.js";
import { $, $all, toast, leerJson, guardarJson } from "./utils.js";
import { APP } from "./config.js";

const STORAGE_KEY = "encuesta_enviada_at";
// Desactivar para permitir envíos repetidos desde el mismo navegador.
// Para reactivar en el futuro, cambiar a true (no borrar el código).
const ANTI_DOBLE_ENVIO = false;

const form = $("#form-encuesta");
const secciones = $all(".wizard-step");
const btnAnterior = $("#btn-anterior");
const btnSiguiente = $("#btn-siguiente");
const btnEnviar = $("#btn-enviar");
const alertaEnvio = $("#alerta-envio");
const revisionList = $("#revision-respuestas");

let pasoActual = 1;

/* ---------- Anti-doble-envío ---------- */

function envioReciente() {
  const ts = leerJson(STORAGE_KEY, null);
  if (!ts) return false;
  const horas = (Date.now() - Number(ts)) / 3_600_000;
  return horas < APP.duplicateSubmitWindowHours;
}

function bloquearFormulario(mensaje) {
  if (alertaEnvio) {
    alertaEnvio.hidden = false;
    alertaEnvio.textContent = mensaje;
  }
  for (const el of form.elements) el.disabled = true;
  btnAnterior.hidden = true;
  btnSiguiente.hidden = true;
  btnEnviar.hidden = true;
}

/* ---------- Lectura de campos ---------- */

function leerCampo(key) {
  const def = VARIABLES_POR_CLAVE[key];
  if (def.input === "likert" || def.input === "nominal") {
    const marcado = form.querySelector(`input[name="${key}"]:checked`);
    return marcado ? marcado.value : "";
  }
  const input = document.getElementById(key);
  return input ? input.value : "";
}

function mostrarError(key, mensaje) {
  const errorEl = document.getElementById(`${key}-error`);
  if (errorEl) errorEl.textContent = mensaje ?? "";
  const campo = document.getElementById(key);
  if (campo) campo.setAttribute("aria-invalid", mensaje ? "true" : "false");
}

/** Valida las preguntas de un paso. Devuelve true si todo es válido. */
function validarPaso(paso) {
  const pasoDef = WIZARD_PASOS.find((p) => p.id === paso);
  let valido = true;

  for (const key of pasoDef.keys) {
    const def = VARIABLES_POR_CLAVE[key];
    const resultado = validarValor(def, leerCampo(key));
    mostrarError(key, resultado.ok ? "" : resultado.mensaje);
    if (!resultado.ok) valido = false;
  }
  return valido;
}

/* ---------- Navegación del wizard ---------- */

function tituloPaso(paso) {
  return WIZARD_PASOS.find((p) => p.id === paso)?.titulo ?? "";
}

function mostrarPaso(paso) {
  // Limitar el paso al rango válido para evitar pasos inexistentes
  pasoActual = Math.max(1, Math.min(paso, WIZARD_PASOS.length));
  paso = pasoActual;


  for (const seccion of secciones) {
    const esActual = Number(seccion.dataset.step) === paso;
    seccion.hidden = !esActual;
    seccion.classList.toggle("is-active", esActual);
  }

  $("#paso-actual").textContent = String(paso);
  $("#paso-total").textContent = String(WIZARD_PASOS.length);
  $("#paso-titulo").textContent = tituloPaso(paso);

  const porcentaje = (paso / WIZARD_PASOS.length) * 100;
  $("#barra-progreso-fill").style.width = `${porcentaje}%`;
  $("#barra-progreso").setAttribute("aria-valuenow", String(Math.round(porcentaje)));

  const esUltimo = paso === WIZARD_PASOS.length;
  btnAnterior.hidden = paso === 1;
  btnSiguiente.hidden = esUltimo;
  btnEnviar.hidden = !esUltimo;

  if (esUltimo) construirRevision();

  const titulo = document.getElementById(`paso-${paso}-titulo`);
  if (titulo) titulo.scrollIntoView({ behavior: "smooth", block: "start" });
}

function construirRevision() {
  revisionList.innerHTML = "";
  for (const def of VARIABLES) {
    const crudo = leerCampo(def.key);
    const dt = document.createElement("dt");
    dt.textContent = `${def.pregunta}. ${def.preguntaTexto}`;
    const dd = document.createElement("dd");

    let texto = crudo === "" ? "—" : crudo;
    if (def.likert && crudo !== "") {
      texto = `${crudo} · ${def.likert[Number(crudo)] ?? ""}`;
    } else if (def.unidad && crudo !== "") {
      texto = `${crudo} ${def.unidad}`;
    }
    dd.textContent = texto;

    revisionList.append(dt, dd);
  }
}

/* ---------- Eventos ---------- */

btnSiguiente.addEventListener("click", () => {
  if (pasoActual >= WIZARD_PASOS.length) return; // nunca avanzar más allá del último paso
  if (validarPaso(pasoActual)) mostrarPaso(pasoActual + 1);
});

btnAnterior.addEventListener("click", () => {
  mostrarPaso(pasoActual - 1);
});

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  // Validar todos los pasos antes de enviar
  let primerInvalido = null;
  for (const paso of WIZARD_PASOS) {
    if (!validarPaso(paso.id) && primerInvalido === null) primerInvalido = paso.id;
  }
  if (primerInvalido !== null) {
    toast("Revise los campos marcados antes de enviar.");
    mostrarPaso(primerInvalido);
    return;
  }

  const datos = {};
  for (const def of VARIABLES) datos[def.key] = leerCampo(def.key);
  const { valido, valores } = validarRegistro(datos);
  if (!valido) {
    toast("Hay respuestas inválidas. Revise el formulario.");
    return;
  }

  btnEnviar.disabled = true;
  btnEnviar.textContent = "Enviando…";

  try {
    const { error } = await supabase.from("respuestas").insert(valores);
    if (error) throw error;

    guardarJson(STORAGE_KEY, Date.now());
    toast("Respuesta registrada correctamente.");
    window.location.href = "gracias.html";
  } catch (error) {
    console.error(error);
    btnEnviar.disabled = false;
    btnEnviar.textContent = "Enviar encuesta";
    alertaEnvio.hidden = false;
    alertaEnvio.textContent =
      "No se pudo registrar la respuesta. Verifique su conexión e inténtelo de nuevo.";
    toast("Error al enviar la encuesta.");
  }
});

/* ---------- Inicio ---------- */

if (ANTI_DOBLE_ENVIO && envioReciente()) {
  bloquearFormulario(
    "Ya registramos una respuesta desde este navegador hace poco tiempo. Gracias por su participación."
  );
} else {
  mostrarPaso(1);
}
