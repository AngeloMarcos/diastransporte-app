// Versão VPS de integrations/lovable/index.ts (ver supabase/client.vps.ts): o
// login social da Lovable não existe fora do Lovable Cloud.
export const lovable = {
  auth: {
    signInWithOAuth: (
      _provider: "google" | "apple" | "microsoft" | "lovable",
      _opts?: { redirect_uri?: string; extraParams?: Record<string, string> },
    ): Promise<{ error: Error; redirected?: false }> =>
      Promise.resolve({ error: new Error("Login social indisponível neste ambiente.") }),
  },
};
