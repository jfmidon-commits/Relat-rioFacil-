"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export default function LoginForm() {
  const router = useRouter();
  const { isConfigured } = getSupabasePublicConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!isConfigured) {
      setErrorMessage("A autenticação ainda não foi conectada ao projeto Supabase.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage("Não foi possível entrar. Confira o e-mail e a senha.");
        return;
      }

      router.replace("/app");
      router.refresh();
    } catch {
      setErrorMessage("Não foi possível iniciar a autenticação neste ambiente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>E-mail</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@empresa.com.br"
        />
      </label>

      <label className="field">
        <span>Senha</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
        />
      </label>

      {!isConfigured ? (
        <div className="notice warning" role="status">
          O login está preparado, mas falta configurar a URL e a anon key do Supabase neste ambiente.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="notice error" role="alert" aria-live="polite">
          {errorMessage}
        </div>
      ) : null}

      <button className="button primary auth-submit" type="submit" disabled={loading || !isConfigured}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
