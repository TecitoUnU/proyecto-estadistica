// Genera js/config.js a partir de variables de entorno (Netlify / local).
// Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/generate-config.mjs
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el entorno.");
  process.exit(1);
}

let template = readFileSync("js/config.example.js", "utf8");
template = template
  .replace("https://TU-PROYECTO.supabase.co", url)
  .replace("TU_ANON_KEY", anon);

writeFileSync("js/config.js", template);
console.log("js/config.js generado correctamente.");
