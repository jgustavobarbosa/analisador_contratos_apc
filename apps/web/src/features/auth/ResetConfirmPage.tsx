import { FormEvent, useState } from 'react';
import { api } from '../../api';

type Props = {
  initialToken?: string;
  onBack: () => void;
  onDone: () => void;
};

export function ResetConfirmPage({ initialToken = '', onBack, onDone }: Props) {
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await api<{ message?: string }>('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword: password }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage('Token inválido/expirado ou senha fora da política.');
      return;
    }
    setMessage('Senha atualizada. Faça login com a nova senha.');
    onDone();
  }

  return (
    <main className="shell">
      <p className="brand">RAY.IA</p>
      <h1>Definir nova senha</h1>
      <p className="lede">
        Cole o token recebido e escolha uma senha que atenda à política mínima.
      </p>
      <form onSubmit={(e) => void onSubmit(e)}>
        <label>
          Token
          <input
            type="text"
            value={token}
            onChange={(ev) => setToken(ev.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label>
          Nova senha
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={busy}>
          Confirmar
        </button>
      </form>
      <p className="auth-links">
        <button type="button" className="linkish" onClick={onBack}>
          Voltar ao login
        </button>
      </p>
      {message ? <p className="status">{message}</p> : null}
    </main>
  );
}
