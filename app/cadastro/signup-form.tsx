"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export default function SignupForm() {
  const router = useRouter();
  const { isConfigured } = getSupabasePublicConfig();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!isConfigured) {
      setErrorMessage("A autenticação ainda não foi conectada ao projeto Supabase.");
      return;
    }

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      setErrorMessage("Informe seu nome para criar a conta.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Use uma senha com pelo menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=/app`;
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: normalizedName,
          },
        },
      });

      if (error) {
        setErrorMessage("Não foi possível criar a conta. Revise os dados e tente novamente.");
        return;
      }

      if (data.session) {
        router.replace("/app");
        router.refresh();
        return;
      }

      setSuccessMessage(
        "Cadastro recebido. Confira seu e-mail e use o link de confirmação para ativar a conta."
      );
      setPassword("");
      setPasswordConfirmation("");
    } catch {
      setErrorMessage("Não foi possível concluir o cadastro neste ambiente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Nome</span>
        <input
          type="text"
          name="fullName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Seu nome"
        />
      </label>

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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo de 8 caracteres"
        />
      </label>

      <label className="field">
        <span>Confirmar senha</span>
        <input
          type="password"
          name="passwordConfirmation"
          autoComplete="new-password"
          required
          minLength={8}
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          placeholder="Repita a senha"
        />
      </label>

      {!isConfigured ? (
        <div className="notice warning" role="status">
          O cadastro está preparado, mas falta configurar a URL e a chave pública do Supabase neste ambiente.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="notice error" role="alert" aria-live="polite">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="notice success" role="status" aria-live="polite">
          {successMessage}
        </div>
      ) : null}

      <button className="button primary auth-submit" type="submit" disabled={loading || !isConfigured}>
        {loading ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
