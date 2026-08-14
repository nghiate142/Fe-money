import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { api, errorMessage, setToken } from '../../lib/api';
import { Button, Field, Input } from '../../components/ui';

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      setToken(data.access_token);
      onLoggedIn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-canvas to-brand-soft p-4">
      <form
        onSubmit={submit}
        className="animate-pop w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-7 shadow-pop"
      >
        <div className="flex flex-col items-center gap-2 pb-1">
          <span className="grid size-11 place-items-center rounded-xl bg-brand text-white">
            <Wallet size={22} />
          </span>
          <h1 className="text-lg font-semibold">Sổ thu chi</h1>
          <p className="text-xs text-muted">Thu chi, công việc và nợ — chạy trên máy bạn</p>
        </div>

        <Field label="Tài khoản">
          <Input
            autoFocus
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </Field>
        <Field label="Mật khẩu">
          <Input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-out-soft px-3 py-2 text-sm text-out">{error}</p>
        )}

        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? 'Đang kiểm tra…' : 'Đăng nhập'}
        </Button>
      </form>
    </div>
  );
}
