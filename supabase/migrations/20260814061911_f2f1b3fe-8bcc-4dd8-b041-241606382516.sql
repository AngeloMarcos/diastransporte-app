DROP POLICY "Rotas ativas públicas" ON public.rotas;

CREATE POLICY "Rotas ativas públicas anon"
ON public.rotas FOR SELECT TO anon
USING (ativo);

CREATE POLICY "Rotas ativas ou admin"
ON public.rotas FOR SELECT TO authenticated
USING (ativo OR public.has_role(auth.uid(), 'admin'::app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;