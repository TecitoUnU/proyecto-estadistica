/**
 * accesoAdmin.js
 * Disparador visual discreto: 5 clics en "2026" dentro de 4 segundos
 * abre el modal de acceso administrativo. NO es seguridad; el acceso
 * real lo impone Supabase Auth + RLS.
 */

const VENTANA_MS = 4000;
const CLICS_REQUERIDOS = 5;

const trigger = document.getElementById("year-trigger");
const modal = document.getElementById("admin-modal");

if (trigger && modal) {
  let clics = [];

  trigger.addEventListener("click", () => {
    const ahora = Date.now();
    clics = clics.filter((t) => ahora - t < VENTANA_MS);
    clics.push(ahora);
    if (clics.length >= CLICS_REQUERIDOS) {
      clics = [];
      if (typeof modal.showModal === "function") modal.showModal();
    }
  });
}
