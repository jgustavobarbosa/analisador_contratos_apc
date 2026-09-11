import { FormEvent, useState } from 'react';
import { api, type Me } from '../../api';
import { BrandLogo } from '../../components/BrandLogo';

type Props = {
  onLoggedIn: (me: Me) => void;
  onGoReset: () => void;
};

export function LoginPage({ onLoggedIn, onGoReset }: Props) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('ChangeMeAdmin1!');
  const [message, setMessage] = useState<string | null>(null);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await api<Me>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok || !res.data) {
      setMessage('Falha no login');
      return;
    }
    onLoggedIn(res.data);
  }

  return (
    <main className="shell font-sans text-slate-100">
      <BrandLogo height={36} className="mb-6" />
      <h1 className="text-2xl font-semibold text-white">
        Analisador de Contratos
      </h1>
      <p className="lede text-slate-400">
        Acesso ao dossiê vivo — demonstração local do caso Unimed–Oncoradium.
      </p>
      <form
        className="mt-6 grid gap-4 rounded-2xl border border-ray-border bg-ray-card bg-ray-gradient-subtle p-5"
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
          className="rounded-lg bg-ray-blue px-4 py-2.5 font-semibold text-white"
        >
          Entrar
        </button>
      </form>
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
