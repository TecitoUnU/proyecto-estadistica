/**
 * frecuencias.js — Tablas de frecuencias simples y agrupadas.
 *
 * Frecuencia simple:
 *   fi = frecuencia absoluta
 *   Fi = frecuencia acumulada
 *   hi = frecuencia relativa (fi / n)
 *   %  = hi × 100 (2 decimales en UI)
 *
 * Agrupada (Regla de Sturges):
 *   k = 1 + 3.322 · log10(n)   (redondeado, mín. 1)
 *   amplitud = (max - min) / k
 *   Los intervalos son [a, b) salvo el último, que incluye el máximo.
 */

import { limpiar } from "./estadistica.js";

/** Frecuencias simples para cualquier valor (numérico o categórico). */
export function tablaFrecuencias(valores) {
  const validos = valores.filter((v) => v !== null && v !== undefined && v !== "");
  const n = validos.length;
  const conteo = new Map();
  for (const v of validos) {
    const clave = typeof v === "number" ? v : String(v);
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }

  const esNumero = validos.every((v) => typeof v === "number" || !Number.isNaN(Number(v)));
  const claves = [...conteo.keys()].sort((a, b) =>
    esNumero ? Number(a) - Number(b) : String(a).localeCompare(String(b), "es")
  );

  let acumulada = 0;
  return {
    n,
    filas: claves.map((clave) => {
      const fi = conteo.get(clave);
      acumulada += fi;
      return {
        valor: clave,
        fi,
        Fi: acumulada,
        hi: n ? fi / n : 0,
        porcentaje: n ? (fi / n) * 100 : 0,
        pctAcumulado: n ? (acumulada / n) * 100 : 0,
      };
    }),
  };
}

/** Tabla de frecuencias para variables cualitativas (sin acumulados numéricos). */
export function tablaCualitativa(valores) {
  return tablaFrecuencias(valores.map(String));
}

/** Número de clases sugerido con la regla de Sturges. */
export function clasesSturges(n) {
  if (n <= 1) return 1;
  return Math.max(1, Math.round(1 + 3.322 * Math.log10(n)));
}

/**
 * Frecuencias agrupadas.
 * @param {number[]} valores
 * @param {number|null} clasesDeseadas si se pasa, se usa ese número de clases
 */
export function tablaAgrupada(valores, clasesDeseadas = null) {
  const xs = limpiar(valores);
  const n = xs.length;
  if (!n) return { n: 0, clases: 0, amplitud: 0, filas: [] };

  const minimo = Math.min(...xs);
  const maximo = Math.max(...xs);
  const k = clasesDeseadas && clasesDeseadas > 0 ? Math.floor(clasesDeseadas) : clasesSturges(n);

  // Evitar amplitud 0 cuando todos los valores son iguales
  const amplitud = maximo === minimo ? 1 : (maximo - minimo) / k;

  const filas = [];
  let acumulada = 0;
  for (let i = 0; i < k; i++) {
    const desde = minimo + i * amplitud;
    const hasta = i === k - 1 ? maximo : desde + amplitud;
    const esUltimo = i === k - 1;
    const fi = xs.filter((x) => (esUltimo ? x >= desde && x <= hasta : x >= desde && x < hasta)).length;
    acumulada += fi;
    filas.push({
      intervalo: `[${redondear(desde)}, ${redondear(hasta)}${esUltimo ? "]" : ")"}`,
      desde,
      hasta,
      marca: (desde + hasta) / 2,
      fi,
      Fi: acumulada,
      hi: n ? fi / n : 0,
      Hi: n ? acumulada / n : 0,
      porcentaje: n ? (fi / n) * 100 : 0,
    });
  }

  return { n, clases: k, amplitud, filas };
}

function redondear(x) {
  return Math.round(x * 100) / 100;
}

/** Categoría modal de una tabla de frecuencias. */
export function categoriaModal(tabla) {
  if (!tabla.filas.length) return null;
  const maxFi = Math.max(...tabla.filas.map((f) => f.fi));
  return tabla.filas.filter((f) => f.fi === maxFi).map((f) => f.valor);
}
