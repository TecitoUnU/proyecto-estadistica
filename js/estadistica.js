/**
 * estadistica.js — Motor estadístico descriptivo, implementado a mano.
 *
 * Convenciones:
 * - Sin dependencias externas de estadística.
 * - Precisión interna completa; el formato para UI se hace en utils.js.
 * - Las funciones ignoran valores no numéricos (NaN, null, undefined, "").
 * - Varianza por defecto: MUESTRA (n - 1). Se puede pedir "poblacion" (n).
 * - Percentiles: método de interpolación lineal sobre posiciones
 *   (NIST / Excel "PERCENTILE.INC"):
 *     pos = (p / 100) * (n - 1)   (índice base 0)
 *     valor = x_ordenado[floor(pos)] + frac * (x_ordenado[floor(pos)+1] - x_ordenado[floor(pos)])
 * - Asimetría: coeficiente de momento g1 = m3 / m2^(3/2),
 *   donde m_k es el k-ésimo momento central.
 * - Curtosis: EXCESO de curtosis g2 = m4 / m2^2 - 3
 *   (0 ≈ mesocúrtica, >0 leptocúrtica, <0 platicúrtica).
 * - Atípicos (Tukey): fuera de [Q1 - 1.5·RIC, Q3 + 1.5·RIC].
 */

/** Limpia la entrada: solo números finitos. */
export function limpiar(valores) {
  if (!Array.isArray(valores)) return [];
  return valores
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((v) => Number.isFinite(v));
}

export function mean(valores) {
  const xs = limpiar(valores);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(valores) {
  return percentile(valores, 50);
}

/**
 * Moda(s): arreglo de valores con mayor frecuencia.
 * - Si varios comparten la frecuencia máxima → todas.
 * - Si cada valor aparece exactamente una vez → [] (sin moda representativa).
 */
export function mode(valores) {
  const xs = limpiar(valores);
  if (!xs.length) return [];
  const conteo = new Map();
  for (const x of xs) conteo.set(x, (conteo.get(x) ?? 0) + 1);
  const maxFreq = Math.max(...conteo.values());
  if (maxFreq === 1) return [];
  return [...conteo.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v);
}

export function min(valores) {
  const xs = limpiar(valores);
  return xs.length ? Math.min(...xs) : null;
}

export function max(valores) {
  const xs = limpiar(valores);
  return xs.length ? Math.max(...xs) : null;
}

export function range(valores) {
  const a = min(valores);
  const b = max(valores);
  return a === null || b === null ? null : b - a;
}

/** Momentos centrales m2..m4 sobre la media. */
function momentosCentrales(xs) {
  const m = mean(xs);
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const x of xs) {
    const d = x - m;
    m2 += d ** 2;
    m3 += d ** 3;
    m4 += d ** 4;
  }
  const n = xs.length;
  return { m2: m2 / n, m3: m3 / n, m4: m4 / n };
}

/**
 * Varianza.
 * @param {'muestra'|'poblacion'} tipo
 */
export function variance(valores, tipo = "muestra") {
  const xs = limpiar(valores);
  const n = xs.length;
  if (tipo === "poblacion") {
    if (!n) return null;
    const m = mean(xs);
    return xs.reduce((a, x) => a + (x - m) ** 2, 0) / n;
  }
  // Muestra (por defecto): denominador n - 1
  if (n < 2) return null;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1);
}

export function standardDeviation(valores, tipo = "muestra") {
  const v = variance(valores, tipo);
  return v === null ? null : Math.sqrt(v);
}

/** CV = (DE / media) × 100. Si la media es 0 → "No definido" (null). */
export function coefficientVariation(valores, tipo = "muestra") {
  const m = mean(valores);
  const sd = standardDeviation(valores, tipo);
  if (m === null || sd === null || m === 0) return null;
  return (sd / Math.abs(m)) * 100;
}

/** Percentil p (0–100) por interpolación lineal (PERCENTILE.INC). */
export function percentile(valores, p) {
  const xs = limpiar(valores).sort((a, b) => a - b);
  const n = xs.length;
  if (!n) return null;
  if (p < 0 || p > 100) return null;
  const pos = (p / 100) * (n - 1);
  const base = Math.floor(pos);
  const frac = pos - base;
  if (base + 1 < n) return xs[base] + frac * (xs[base + 1] - xs[base]);
  return xs[base];
}

export function quartile(valores, q) {
  // q: 1, 2 o 3
  return percentile(valores, q * 25);
}

export function iqr(valores) {
  const q1 = quartile(valores, 1);
  const q3 = quartile(valores, 3);
  return q1 === null || q3 === null ? null : q3 - q1;
}

/** Asimetría (sesgo muestral, momento 3 normalizado). */
export function skewness(valores) {
  const xs = limpiar(valores);
  if (xs.length < 3) return null;
  const { m2, m3 } = momentosCentrales(xs);
  if (m2 === 0) return 0; // todos los valores iguales
  return m3 / Math.pow(m2, 1.5);
}

/** Curtosis — EXCESO (g2 = m4/m2² − 3). */
export function kurtosis(valores) {
  const xs = limpiar(valores);
  if (xs.length < 4) return null;
  const { m2, m4 } = momentosCentrales(xs);
  if (m2 === 0) return 0;
  return m4 / (m2 * m2) - 3;
}

/**
 * Valores atípicos por regla de Tukey (1.5 × RIC).
 * @returns {{ limites: {inferior:number, superior:number} | null, conteo: number, valores: number[] }}
 */
export function detectOutliers(valores) {
  const xs = limpiar(valores);
  const q1 = quartile(xs, 1);
  const q3 = quartile(xs, 3);
  if (q1 === null || q3 === null) return { limites: null, conteo: 0, valores: [] };
  const ric = q3 - q1;
  const inferior = q1 - 1.5 * ric;
  const superior = q3 + 1.5 * ric;
  const atipicos = xs.filter((x) => x < inferior || x > superior);
  return { limites: { inferior, superior }, conteo: atipicos.length, valores: atipicos };
}

/** Resumen completo de una variable cuantitativa. */
export function resumenCuantitativo(valores, tipoVarianza = "muestra") {
  const xs = limpiar(valores);
  const ats = detectOutliers(xs);
  return {
    n: xs.length,
    media: mean(xs),
    mediana: median(xs),
    moda: mode(xs),
    minimo: min(xs),
    maximo: max(xs),
    rango: range(xs),
    varianza: variance(xs, tipoVarianza),
    desviacion: standardDeviation(xs, tipoVarianza),
    cv: coefficientVariation(xs, tipoVarianza),
    q1: quartile(xs, 1),
    q2: quartile(xs, 2),
    q3: quartile(xs, 3),
    ric: iqr(xs),
    p10: percentile(xs, 10),
    p25: percentile(xs, 25),
    p50: percentile(xs, 50),
    p75: percentile(xs, 75),
    p90: percentile(xs, 90),
    asimetria: skewness(xs),
    curtosis: kurtosis(xs),
    atipicos: ats,
    tipoVarianza,
  };
}

/** Interpretación textual de asimetría y curtosis. */
export function interpretarForma(asimetria, curtosisExceso) {
  let textoAsimetria = "No se pudo calcular la asimetría.";
  if (asimetria !== null && Number.isFinite(asimetria)) {
    if (asimetria > -0.5 && asimetria < 0.5) {
      textoAsimetria = "Aproximadamente simétrica";
    } else if (asimetria >= 0.5) {
      textoAsimetria = "Asimétrica positiva (cola hacia valores altos)";
    } else {
      textoAsimetria = "Asimétrica negativa (cola hacia valores bajos)";
    }
  }

  let textoCurtosis = "No se pudo calcular la curtosis.";
  if (curtosisExceso !== null && Number.isFinite(curtosisExceso)) {
    const tol = 0.5;
    if (Math.abs(curtosisExceso) <= tol) {
      textoCurtosis = "Mesocúrtica (forma similar a la distribución normal)";
    } else if (curtosisExceso > 0) {
      textoCurtosis = "Leptocúrtica (más concentración en el centro y colas más pesadas)";
    } else {
      textoCurtosis = "Platicúrtica (distribución más aplanada)";
    }
  }

  return { asimetria: textoAsimetria, curtosis: textoCurtosis };
}
