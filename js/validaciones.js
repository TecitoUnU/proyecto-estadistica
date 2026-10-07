/**
 * validaciones.js
 * Validación reutilizable de campos y registros completos.
 * Se usa tanto en el wizard de la encuesta como en el importador.
 */

import { VARIABLES, VARIABLES_POR_CLAVE } from "./catalogo.js";

/**
 * Valida un valor crudo (string del input) contra la definición de la variable.
 * @returns {{ ok: boolean, mensaje: string, valor: number|string|null }}
 */
export function validarValor(def, crudo) {
  const texto = crudo === null || crudo === undefined ? "" : String(crudo).trim();

  if (texto === "") {
    return { ok: false, mensaje: "Este campo es obligatorio.", valor: null };
  }

  // Variables cualitativas nominales
  if (def.naturaleza === "cualitativa") {
    if (def.categorias && !def.categorias.includes(texto)) {
      return { ok: false, mensaje: "Seleccione una opción válida.", valor: null };
    }
    return { ok: true, mensaje: "", valor: texto };
  }

  // Variables cuantitativas
  const numero = Number(texto);
  if (Number.isNaN(numero) || !Number.isFinite(numero)) {
    return { ok: false, mensaje: "Ingrese un número válido.", valor: null };
  }

  if (!def.decimales && !Number.isInteger(numero)) {
    return { ok: false, mensaje: "Debe ingresar un número entero (sin decimales).", valor: null };
  }

  if (typeof def.min === "number" && numero < def.min) {
    return { ok: false, mensaje: `El valor mínimo permitido es ${def.min}.`, valor: null };
  }

  if (typeof def.max === "number" && numero > def.max) {
    return { ok: false, mensaje: `El valor máximo permitido es ${def.max}.`, valor: null };
  }

  // Escalas Likert: entero estrictamente entre 1 y 5
  if (def.input === "likert" && (!Number.isInteger(numero) || numero < 1 || numero > 5)) {
    return { ok: false, mensaje: "Seleccione un valor de 1 a 5.", valor: null };
  }

  return { ok: true, mensaje: "", valor: numero };
}

/**
 * Valida un objeto con las 10 variables.
 * @param {Record<string, *>} datos valores crudos (strings o números)
 * @returns {{ valido: boolean, errores: Record<string,string>, valores: Record<string,*> }}
 */
export function validarRegistro(datos) {
  const errores = {};
  const valores = {};

  for (const def of VARIABLES) {
    const resultado = validarValor(def, datos[def.key]);
    if (!resultado.ok) {
      errores[def.key] = resultado.mensaje;
    } else {
      valores[def.key] = resultado.valor;
    }
  }

  return { valido: Object.keys(errores).length === 0, errores, valores };
}

/** Devuelve la definición de una variable por su clave. */
export function definicion(key) {
  return VARIABLES_POR_CLAVE[key] ?? null;
}
