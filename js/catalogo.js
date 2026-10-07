/**
 * Contrato de las 10 variables de la encuesta.
 * Fuente única de verdad para validación, importación, frecuencias y gráficos.
 */

export const METODOS_PAGO = [
  "Tarjeta de crédito",
  "Tarjeta de débito",
  "Transferencia bancaria",
  "PayPal",
  "Billetera digital",
  "Pago contra entrega",
  "Otro",
];

export const FACTORES_ELECCION = [
  "Seguridad",
  "Facilidad de uso",
  "Rapidez",
  "Promociones o descuentos",
  "Disponibilidad",
  "Confianza en la plataforma",
  "Costos o comisiones",
  "Otro",
];

export const LIKERT_SEGURIDAD = {
  1: "Nada seguro",
  2: "Poco seguro",
  3: "Neutral",
  4: "Seguro",
  5: "Muy seguro",
};

export const LIKERT_CONFIANZA = {
  1: "Ninguna confianza",
  2: "Poca confianza",
  3: "Neutral",
  4: "Confianza",
  5: "Mucha confianza",
};

/**
 * @typedef {Object} VariableDef
 * @property {string} key
 * @property {number} pregunta
 * @property {string} etiqueta
 * @property {string} preguntaTexto
 * @property {'cuantitativa'|'cualitativa'} naturaleza
 * @property {'discreta'|'continua'|'ordinal'|'nominal'} escala
 * @property {'number'|'likert'|'nominal'} input
 * @property {number} [min]
 * @property {number} [max]
 * @property {boolean} [decimales]
 * @property {string} [unidad]
 * @property {string[]} [categorias]
 * @property {Record<number,string>} [likert]
 * @property {string} grafico
 */

/** @type {VariableDef[]} */
export const VARIABLES = [
  {
    key: "edad",
    pregunta: 1,
    etiqueta: "Edad",
    preguntaTexto: "¿Cuál es su edad?",
    naturaleza: "cuantitativa",
    escala: "discreta",
    input: "number",
    min: 15,
    max: 80,
    decimales: false,
    unidad: "años",
    grafico: "histograma",
  },
  {
    key: "compras_mes",
    pregunta: 2,
    etiqueta: "Compras por mes",
    preguntaTexto: "¿Cuántas compras por Internet realiza aproximadamente en un mes?",
    naturaleza: "cuantitativa",
    escala: "discreta",
    input: "number",
    min: 0,
    max: 50,
    decimales: false,
    unidad: "compras",
    grafico: "histograma",
  },
  {
    key: "gasto_mensual",
    pregunta: 3,
    etiqueta: "Gasto mensual",
    preguntaTexto: "¿Cuánto dinero gasta aproximadamente al mes en compras por Internet?",
    naturaleza: "cuantitativa",
    escala: "continua",
    input: "number",
    min: 0,
    max: 50000,
    decimales: true,
    unidad: "Q",
    grafico: "histograma",
  },
  {
    key: "anios_comprando",
    pregunta: 4,
    etiqueta: "Años comprando en línea",
    preguntaTexto: "¿Cuántos años lleva realizando compras por Internet?",
    naturaleza: "cuantitativa",
    escala: "continua",
    input: "number",
    min: 0,
    max: 30,
    decimales: true,
    unidad: "años",
    grafico: "histograma",
  },
  {
    key: "cantidad_metodos_pago",
    pregunta: 5,
    etiqueta: "Cantidad de medios de pago",
    preguntaTexto: "¿Cuántos medios de pago digitales diferentes utiliza regularmente?",
    naturaleza: "cuantitativa",
    escala: "discreta",
    input: "number",
    min: 0,
    max: 10,
    decimales: false,
    unidad: "medios",
    grafico: "barras",
  },
  {
    key: "seguridad_pago",
    pregunta: 6,
    etiqueta: "Percepción de seguridad",
    preguntaTexto: "En una escala de 1 a 5, ¿qué tan seguro considera realizar pagos por Internet?",
    naturaleza: "cuantitativa",
    escala: "ordinal",
    input: "likert",
    min: 1,
    max: 5,
    decimales: false,
    likert: LIKERT_SEGURIDAD,
    grafico: "likert",
  },
  {
    key: "confianza_pago",
    pregunta: 7,
    etiqueta: "Confianza al proporcionar datos de pago",
    preguntaTexto:
      "En una escala de 1 a 5, ¿qué nivel de confianza tiene al proporcionar información de pago en tiendas en línea?",
    naturaleza: "cuantitativa",
    escala: "ordinal",
    input: "likert",
    min: 1,
    max: 5,
    decimales: false,
    likert: LIKERT_CONFIANZA,
    grafico: "likert",
  },
  {
    key: "compras_pago_digital",
    pregunta: 8,
    etiqueta: "Compras con pago digital (de cada 10)",
    preguntaTexto:
      "De cada 10 compras que realiza, aproximadamente ¿cuántas paga utilizando medios digitales?",
    naturaleza: "cuantitativa",
    escala: "discreta",
    input: "number",
    min: 0,
    max: 10,
    decimales: false,
    unidad: "de 10",
    grafico: "barras",
  },
  {
    key: "metodo_preferido",
    pregunta: 9,
    etiqueta: "Medio de pago principal",
    preguntaTexto: "¿Cuál es el medio de pago que utiliza principalmente en sus compras por Internet?",
    naturaleza: "cualitativa",
    escala: "nominal",
    input: "nominal",
    categorias: METODOS_PAGO,
    grafico: "dona",
  },
  {
    key: "factor_eleccion",
    pregunta: 10,
    etiqueta: "Factor de elección",
    preguntaTexto:
      "¿Cuál considera que es la principal razón que influye en su elección de un medio de pago digital?",
    naturaleza: "cualitativa",
    escala: "nominal",
    input: "nominal",
    categorias: FACTORES_ELECCION,
    grafico: "barras-horizontales",
  },
];

export const VARIABLES_POR_CLAVE = Object.fromEntries(VARIABLES.map((v) => [v.key, v]));

export const CAMPOS_CUANTITATIVOS = VARIABLES.filter((v) => v.naturaleza === "cuantitativa").map(
  (v) => v.key
);

export const CAMPOS_CUALITATIVOS = VARIABLES.filter((v) => v.naturaleza === "cualitativa").map(
  (v) => v.key
);

export const WIZARD_PASOS = [
  { id: 1, titulo: "Datos generales", keys: ["edad", "compras_mes"] },
  { id: 2, titulo: "Hábitos de compra", keys: ["gasto_mensual", "anios_comprando", "cantidad_metodos_pago"] },
  { id: 3, titulo: "Seguridad y confianza", keys: ["seguridad_pago", "confianza_pago", "compras_pago_digital"] },
  { id: 4, titulo: "Preferencias y revisión", keys: ["metodo_preferido", "factor_eleccion"] },
];
