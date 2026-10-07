/**
 * login.js
 * Autenticación del administrador con Supabase Auth y verificación de rol.
 * Flujo:
 *  1. Si ya hay sesión con role='admin' → ir al dashboard.
 *  2. Enviar credenciales con signInWithPassword.
 *  3. Verificar perfil: role debe ser 'admin'; si no → signOut + error.
 */

import { supabase, getAdminProfile } from "./supabase.js";
import { $, toast } from "./utils.js";

const form = $("#form-login");
const alerta = $("#alerta-login");
const btnLogin = $("#btn-login");

function mostrarError(campoId, mensaje) {
  const el = document.getElementById(campoId);
  if (el) el.textContent = mensaje ?? "";
}

function mostrarAlerta(mensaje) {
  alerta.hidden = !mensaje;
  alerta.textContent = mensaje ?? "";
}

/** Redirige solo si el usuario autenticado tiene role 'admin'. */
async function redirigirSiAdmin() {
  try {
    const { session, profile } = await getAdminProfile();
    if (session && profile?.role === "admin") {
      window.location.replace("dashboard.html");
      return true;
    }
  } catch (error) {
    console.error(error);
  }
  return false;
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const correo = $("#correo").value.trim();
  const password = $("#password").value;

  let valido = true;
  mostrarError("correo-error", "");
  mostrarError("password-error", "");
  mostrarAlerta("");

  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    mostrarError("correo-error", "Ingrese un correo válido.");
    valido = false;
  }
  if (!password) {
    mostrarError("password-error", "Ingrese su contraseña.");
    valido = false;
  }
  if (!valido) return;

  btnLogin.disabled = true;
  btnLogin.textContent = "Verificando…";

  try {
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password });
    if (error) throw error;

    const { session, profile } = await getAdminProfile();
    if (!session || profile?.role !== "admin") {
      await supabase.auth.signOut();
      mostrarAlerta("Esta cuenta no tiene permisos de administrador.");
      return;
    }

    toast("Sesión iniciada.");
    window.location.replace("dashboard.html");
  } catch (error) {
    console.error(error);
    mostrarAlerta("Credenciales incorrectas o cuenta no disponible.");
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
});

redirigirSiAdmin();
