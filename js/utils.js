const TOAST_STACK_ID = "toast-stack";

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function formatNumero(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(decimals);
}

export function formatPorcentaje(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(2)} %`;
}

export function ensureToastStack() {
  let stack = document.getElementById(TOAST_STACK_ID);
  if (!stack) {
    stack = document.createElement("div");
    stack.id = TOAST_STACK_ID;
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.append(stack);
  }
  return stack;
}

export function toast(message) {
  const stack = ensureToastStack();
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  stack.append(item);
  window.setTimeout(() => item.remove(), 4200);
}

export function leerJson(clave, fallback = null) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function guardarJson(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}
