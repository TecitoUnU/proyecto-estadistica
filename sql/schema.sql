-- =============================================================================
-- Proyecto: Comercio electrónico y medios de pago digitales
-- Estadística I · 2026
-- Esquema PostgreSQL para Supabase
-- =============================================================================
-- Cómo ejecutar:
--   1. Abrir el proyecto en https://supabase.com
--   2. SQL Editor → New query
--   3. Pegar este archivo completo y Run
--
-- Después: sql/crear_admin.sql (manual, no hay registro público).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tabla: profiles (debe existir ANTES de is_admin())
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK (role = 'admin')
);

COMMENT ON TABLE public.profiles IS
  'Perfiles de administradores. Sin registro público; se crea a mano.';

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- -----------------------------------------------------------------------------
-- Función: comprobar rol administrador
-- SECURITY DEFINER evita recursión de RLS al leer profiles.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

COMMENT ON FUNCTION public.is_admin() IS
  'True si el usuario autenticado tiene profiles.role = admin.';

-- -----------------------------------------------------------------------------
-- Tabla: respuestas
-- CHECK alineados con js/catalogo.js
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.respuestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  edad INTEGER,
  compras_mes INTEGER,
  gasto_mensual NUMERIC(12, 2),
  anios_comprando NUMERIC(5, 2),
  cantidad_metodos_pago INTEGER,
  seguridad_pago INTEGER,
  confianza_pago INTEGER,
  compras_pago_digital INTEGER,
  metodo_preferido TEXT,
  factor_eleccion TEXT,

  excluded_from_analysis BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT respuestas_edad_check
    CHECK (edad IS NULL OR edad BETWEEN 15 AND 80),
  CONSTRAINT respuestas_compras_mes_check
    CHECK (compras_mes IS NULL OR compras_mes BETWEEN 0 AND 50),
  CONSTRAINT respuestas_gasto_mensual_check
    CHECK (gasto_mensual IS NULL OR gasto_mensual BETWEEN 0 AND 50000),
  CONSTRAINT respuestas_anios_comprando_check
    CHECK (anios_comprando IS NULL OR anios_comprando BETWEEN 0 AND 30),
  CONSTRAINT respuestas_cantidad_metodos_pago_check
    CHECK (cantidad_metodos_pago IS NULL OR cantidad_metodos_pago BETWEEN 0 AND 10),
  CONSTRAINT respuestas_seguridad_pago_check
    CHECK (seguridad_pago IS NULL OR seguridad_pago BETWEEN 1 AND 5),
  CONSTRAINT respuestas_confianza_pago_check
    CHECK (confianza_pago IS NULL OR confianza_pago BETWEEN 1 AND 5),
  CONSTRAINT respuestas_compras_pago_digital_check
    CHECK (compras_pago_digital IS NULL OR compras_pago_digital BETWEEN 0 AND 10),
  CONSTRAINT respuestas_metodo_preferido_check
    CHECK (
      metodo_preferido IS NULL
      OR metodo_preferido IN (
        'Tarjeta de crédito',
        'Tarjeta de débito',
        'Transferencia bancaria',
        'PayPal',
        'Billetera digital',
        'Pago contra entrega',
        'Otro'
      )
    ),
  CONSTRAINT respuestas_factor_eleccion_check
    CHECK (
      factor_eleccion IS NULL
      OR factor_eleccion IN (
        'Seguridad',
        'Facilidad de uso',
        'Rapidez',
        'Promociones o descuentos',
        'Disponibilidad',
        'Confianza en la plataforma',
        'Costos o comisiones',
        'Otro'
      )
    )
);

COMMENT ON TABLE public.respuestas IS
  'Respuestas anónimas de la encuesta. Sin PII.';
COMMENT ON COLUMN public.respuestas.excluded_from_analysis IS
  'Si true, el registro se omite del análisis estadístico sin borrarlo.';

CREATE INDEX IF NOT EXISTS respuestas_created_at_idx
  ON public.respuestas (created_at DESC);

CREATE INDEX IF NOT EXISTS respuestas_excluded_idx
  ON public.respuestas (excluded_from_analysis);

CREATE INDEX IF NOT EXISTS respuestas_metodo_preferido_idx
  ON public.respuestas (metodo_preferido);

CREATE INDEX IF NOT EXISTS respuestas_factor_eleccion_idx
  ON public.respuestas (factor_eleccion);

-- -----------------------------------------------------------------------------
-- Tabla: data_cleaning_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_cleaning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES public.respuestas (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  variable TEXT,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT data_cleaning_log_action_check CHECK (
    action IN ('exclude', 'restore', 'delete', 'update', 'note')
  )
);

COMMENT ON TABLE public.data_cleaning_log IS
  'Auditoría de decisiones de limpieza tomadas por administradores.';

CREATE INDEX IF NOT EXISTS data_cleaning_log_response_idx
  ON public.data_cleaning_log (response_id);

CREATE INDEX IF NOT EXISTS data_cleaning_log_created_at_idx
  ON public.data_cleaning_log (created_at DESC);

CREATE INDEX IF NOT EXISTS data_cleaning_log_admin_idx
  ON public.data_cleaning_log (admin_id);

-- -----------------------------------------------------------------------------
-- Permisos de tabla (RLS sigue siendo la frontera real)
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT INSERT ON public.respuestas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.respuestas TO authenticated;

GRANT SELECT ON public.profiles TO authenticated;

GRANT SELECT, INSERT ON public.data_cleaning_log TO authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_cleaning_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.data_cleaning_log FORCE ROW LEVEL SECURITY;

-- ---------- profiles ----------
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Sin INSERT/UPDATE/DELETE desde el cliente: el rol se asigna en SQL Editor.

-- ---------- respuestas ----------
-- Público anónimo: solo INSERT de registros no excluidos.
DROP POLICY IF EXISTS respuestas_anon_insert ON public.respuestas;
CREATE POLICY respuestas_anon_insert
  ON public.respuestas
  FOR INSERT
  TO anon
  WITH CHECK (excluded_from_analysis = false);

-- Anónimos: sin SELECT, UPDATE ni DELETE (no se crean políticas).

DROP POLICY IF EXISTS respuestas_admin_select ON public.respuestas;
CREATE POLICY respuestas_admin_select
  ON public.respuestas
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS respuestas_admin_insert ON public.respuestas;
CREATE POLICY respuestas_admin_insert
  ON public.respuestas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS respuestas_admin_update ON public.respuestas;
CREATE POLICY respuestas_admin_update
  ON public.respuestas
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS respuestas_admin_delete ON public.respuestas;
CREATE POLICY respuestas_admin_delete
  ON public.respuestas
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------- data_cleaning_log ----------
DROP POLICY IF EXISTS cleaning_admin_select ON public.data_cleaning_log;
CREATE POLICY cleaning_admin_select
  ON public.data_cleaning_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS cleaning_admin_insert ON public.data_cleaning_log;
CREATE POLICY cleaning_admin_insert
  ON public.data_cleaning_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND admin_id = auth.uid());

-- =============================================================================
-- Comprobaciones rápidas (opcional, no fallan el script)
-- =============================================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT policyname, tablename, cmd, roles FROM pg_policies WHERE schemaname = 'public';
