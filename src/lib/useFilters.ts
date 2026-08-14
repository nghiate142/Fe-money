import { useSearchParams } from 'react-router-dom';

/**
 * Bộ lọc sống trong URL: reload vẫn giữ nguyên, copy link là chia sẻ được.
 * Mỗi tab là một route riêng nên query string không đụng nhau.
 */
export function useFilters<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();

  const values = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const v = params.get(key);
    if (v !== null) (values as Record<string, string>)[key] = v;
  }

  const set = (patch: Partial<Record<keyof T, string>>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === '') next.delete(k);
          else next.set(k, v);
        }
        // Đổi bộ lọc thì luôn về trang 1, trừ khi chính page đang được đổi.
        if (!('page' in patch)) next.delete('page');
        return next;
      },
      { replace: true },
    );

  const reset = () => setParams(new URLSearchParams(), { replace: true });

  /** Số bộ lọc đang bật (không tính page/sort) — để hiện badge. */
  const activeCount = Object.keys(defaults).filter(
    (k) => k !== 'page' && k !== 'sort' && params.get(k),
  ).length;

  return { values, set, reset, activeCount };
}

/** Bỏ các key rỗng trước khi gửi lên API. */
export function queryString(values: Record<string, string>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v !== '') p.set(k, v);
  return p.toString();
}
