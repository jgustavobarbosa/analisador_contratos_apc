import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../../api';

type Role = { id: string; code: string; name: string };
type UserRow = {
  id: string;
  email: string;
  status: string;
  role: { code: string; name: string };
  createdAt: string;
  lastLoginAt: string | null;
};

type Props = {
  canWrite: boolean;
};

export function UsersAdminPage({ canWrite }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [u, r] = await Promise.all([
      api<UserRow[]>('/users'),
      api<Role[]>('/roles'),
    ]);
    if (u.ok && u.data) setUsers(u.data);
    if (r.ok && r.data) {
      const list = r.data;
      setRoles(list);
      setRoleId((prev) => prev || list[0]?.id || '');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function roleCodeForId(id: string): string | undefined {
    return roles.find((r) => r.id === id)?.code;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    const roleCode = roleCodeForId(roleId);
    if (!roleCode) {
      setMessage('Selecione um papel válido');
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await api('/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, roleCode }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage('Não foi possível criar o usuário');
      return;
    }
    setEmail('');
    setPassword('');
    setMessage('Usuário criado');
    await refresh();
  }

  async function onDisable(userId: string) {
    if (!canWrite) return;
    setBusy(true);
    setMessage(null);
    const res = await api(`/users/${userId}/disable`, { method: 'POST' });
    setBusy(false);
    if (!res.ok) {
      setMessage('Não foi possível desativar (último admin?)');
      return;
    }
    setMessage('Usuário desativado');
    await refresh();
  }

  async function onChangeRole(userId: string, nextRoleId: string) {
    if (!canWrite) return;
    const roleCode = roleCodeForId(nextRoleId);
    if (!roleCode) return;
    setBusy(true);
    setMessage(null);
    const res = await api(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ roleCode }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage('Não foi possível alterar o papel');
      return;
    }
    setMessage('Papel atualizado');
    await refresh();
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Usuários</h2>
      </div>
      <p className="muted">
        Gestão do tenant atual. A API exige permissão{' '}
        <code>user:write</code> para alterações.
      </p>

      {canWrite ? (
        <form className="users-form" onSubmit={(e) => void onCreate(e)}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </label>
          <label>
            Papel
            <select
              value={roleId}
              onChange={(ev) => setRoleId(ev.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy}>
            Criar usuário
          </button>
        </form>
      ) : null}

      <ul className="user-list">
        {users.map((u) => {
          const currentRoleId =
            roles.find((r) => r.code === u.role.code)?.id ?? '';
          return (
            <li key={u.id} className="user-row">
              <div>
                <strong>{u.email}</strong>
                <span>
                  {u.status} · {u.role.name}
                </span>
              </div>
              {canWrite ? (
                <div className="user-actions">
                  <select
                    aria-label={`Papel de ${u.email}`}
                    value={currentRoleId}
                    disabled={busy || u.status === 'disabled'}
                    onChange={(ev) =>
                      void onChangeRole(u.id, ev.target.value)
                    }
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code}
                      </option>
                    ))}
                  </select>
                  {u.status === 'active' ? (
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={busy}
                      onClick={() => void onDisable(u.id)}
                    >
                      Desativar
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {message ? <p className="status">{message}</p> : null}
    </section>
  );
}
