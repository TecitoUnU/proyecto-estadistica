/**
 * admin.js — Shell del dashboard:
 * 1) Gate de autenticación + rol admin (no carga datos sin autorización).
 * 2) Navegación interna por vistas.
 * 3) Sidebar colapsable en móvil.
 * 4) Cierre de sesión.
 */

import { requireAdmin, signOut } from "./supabase.js";
import { $, $all } from "./utils.js";

// Gate: si no es admin, redirigir al login y detener la carga.
const acceso = await requireAdmin();
if (!acceso) {
  window.location.replace("login.html");
  throw new Error("Acceso denegado");
}

/* Navegación interna */
function activarVista(nombre) {
  for (const btn of $all(".nav-link[data-view]")) {
    btn.classList.toggle("is-active", btn.dataset.view === nombre);
  }
  for (const panel of $all("[data-view-panel]")) {
    panel.hidden = panel.dataset.viewPanel !== nombre;
  }
}

for (const btn of $all(".nav-link[data-view]")) {
  btn.addEventListener("click", () => {
    activarVista(btn.dataset.view);
    cerrarSidebarMovil();
  });
}

/* Sidebar móvil */
const sidebar = $("#sidebar");
const backdrop = $("#sidebar-backdrop");

function cerrarSidebarMovil() {
  sidebar.classList.remove("is-open");
  backdrop.classList.remove("is-open");
}

$("#sidebar-toggle").addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
  backdrop.classList.toggle("is-open");
});
backdrop.addEventListener("click", cerrarSidebarMovil);

/* Logout */
$("#btn-logout").addEventListener("click", async () => {
  await signOut();
  window.location.replace("login.html");
});

export { acceso };
