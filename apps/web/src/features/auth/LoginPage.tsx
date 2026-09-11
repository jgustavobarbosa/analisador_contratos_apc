import { FormEvent, useState } from 'react';
import {
  api,
  apiBaseUrl,
  DEMO_ME,
  setDemoSession,
  type Me,
} from '../../api';
import { BrandLogo } from '../../components/BrandLogo';

type Props = {
  onLoggedIn: (me: Me) => void;
  onGoReset: () => void;
};

export function LoginPage({ onLoggedIn, onGoReset }: Props) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('ChangeMeAdmin1!');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configuredApi = apiBaseUrl();

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    const res = await api<Me>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      setMessage(
        res.error ??
          (res.status === 401
            ? 'Credenciais inválidas.'
            : 'Falha no login. Verifique se a API está online.'),
      );
      return;
    }
    setDemoSession(false);
    onLoggedIn(res.data);
  }

  function onDemoLogin() {
    setDemoSession(true);
    onLoggedIn(DEMO_ME);
  }

  return (
    <main className="shell font-sans text-slate-100">
      <BrandLogo height={36} className="mb-6" />
      <h1 className="text-2xl font-semibold text-white">
        Analisador de Contratos
      </h1>
      <p className="lede text-slate-400">
        Acesso ao dossiê vivo — demonstração do caso Unimed–Oncoradium.
      </p>

      {!configuredApi ? (
        <p className="mb-4 rounded-lg border border-ray-warning/40 bg-ray-warning/10 px-3 py-2 text-sm text-ray-warning">
          Front no Vercel sem{' '}
          <code className="text-xs">VITE_API_BASE_URL</code>. O login real
          precisa da API Nest em outro host; use o modo demonstração abaixo ou
          configure a variável no projeto Vercel.
        </p>
      ) : (
        <p className="mb-4 text-xs text-slate-500">
          API: <code className="text-ray-cyan">{configuredApi}</code>
        </p>
      )}

      <form
        className="mt-2 grid gap-4 rounded-2xl border border-ray-border bg-ray-card bg-ray-gradient-subtle p-5"
        onSubmit={(e) => void onLogin(e)}
      >
        <label className="grid gap-1 text-sm text-slate-300">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            autoComplete="username"
            className="rounded-lg border border-ray-border bg-ray-bg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-ray-cyan/40"
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-300">
          Senha
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            autoComplete="current-password"
            className="rounded-lg border border-ray-border bg-ray-bg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-ray-cyan/40"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-ray-blue px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <button
        type="button"
        onClick={onDemoLogin}
        className="mt-3 w-full rounded-lg border border-ray-neon/40 bg-ray-neon/10 px-4 py-2.5 text-sm font-semibold text-ray-neon transition hover:bg-ray-neon/20"
      >
        Continuar em modo demonstração (sem API)
      </button>

      <p className="auth-links mt-4">
        <button
          type="button"
          className="linkish border-0 bg-transparent p-0 text-ray-cyan underline-offset-2 hover:underline"
          onClick={onGoReset}
        >
          Esqueci a senha
        </button>
      </p>
      {message ? (
        <p className="status mt-3 text-sm text-ray-alert">{message}</p>
      ) : null}
    </main>
  );
}
