-- Consultas de verificación (ejecutar como postgres en SQL Editor).
-- El rol anon no debe poder hacer SELECT de respuestas.

SELECT relname AS tabla, relrowsecurity AS rls, relforcerowsecurity AS force_rls
FROM pg_class
WHERE relname IN ('respuestas', 'profiles', 'data_cleaning_log');

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.respuestas'::regclass
  AND contype = 'c'
ORDER BY conname;
