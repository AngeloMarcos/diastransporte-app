
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_transicionar_status(BIGINT, public.pedido_status) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_atribuir_motorista(BIGINT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
