const vnd = new Intl.NumberFormat('vi-VN');

export const money = (n: number | undefined | null) =>
  n == null ? '—' : vnd.format(n);

/** ISO -> yyyy-mm-dd (hợp với <input type="date">). */
export const day = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10) : '';

export const dayVN = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const today = () => new Date().toISOString().slice(0, 10);

export const monthStart = () => today().slice(0, 8) + '01';
