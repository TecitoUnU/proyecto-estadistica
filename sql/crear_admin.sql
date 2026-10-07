-- =============================================================================
-- Crear el primer administrador (manual, una sola vez)
-- =============================================================================
-- NO hay registro público. La contraseña vive solo en Supabase Auth.
--
-- Pasos:
-- 1. Authentication → Users → Add user
--    - Email: el correo del administrador
--    - Password: contraseña segura
--    - Auto Confirm User: sí
-- 2. Copiar el UUID del usuario (Authentication → Users → id)
-- 3. Sustituir el UUID de abajo y ejecutar este script en SQL Editor
-- =============================================================================

-- INSERT INTO public.profiles (id, role)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'admin');

-- Alternativa si ya conoces el email del usuario en auth.users:
INSERT INTO public.profiles (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin.pruebas@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- Verificar:
-- SELECT p.id, u.email, p.role, p.created_at
-- FROM public.profiles p
-- JOIN auth.users u ON u.id = p.id;
