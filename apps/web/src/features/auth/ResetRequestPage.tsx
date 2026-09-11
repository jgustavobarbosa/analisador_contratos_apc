import { FormEvent, useState } from 'react';
import { api } from '../../api';

type Props = {
  onBack: () => void;
  onGoConfirm: () => void;
};

export function ResetRequestPage({ onBack, onGoConfirm }: Props) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await api<{ message?: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (res.status === 202 || res.ok) {
      setMessage(
        'Se a conta existir, enviamos instruções. Em ambiente local, o token aparece no log da API.',
      );
      return;
    }
    setMessage('Não foi possível solicitar a recuperação.');
  }

  return (
    <main className="shell">
      <p className="brand">RAY.IA</p>
      <h1>Recuperar senha</h1>
      <p className="lede">
        Informe o e-mail. A resposta é genérica — não revelamos se a conta existe.
      </p>
      <form onSubmit={(e) => void onSubmit(e)}>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <button type="submit" disabled={busy}>
          Solicitar link
        </button>
      </form>
      <p className="auth-links">
        <button type="button" className="linkish" onClick={onBack}>
          Voltar ao login
        </button>
        <button type="button" className="linkish" onClick={onGoConfirm}>
          Já tenho o token
        </button>
      </p>
      {message ? <p className="status">{message}</p> : null}
    </main>
  );
}
