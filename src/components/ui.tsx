import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight, Inbox, Pencil, Trash2, X } from 'lucide-react';

/* ---------- lớp dùng chung cho bảng ---------- */

export const tableCls = 'w-full text-sm';
export const theadCls =
  'text-left text-[11px] font-semibold uppercase tracking-wider text-faint';
export const thCls = 'px-2 py-2.5 font-semibold whitespace-nowrap sm:px-3';
export const trCls = 'border-t border-line transition-colors hover:bg-canvas';
export const tdCls = 'px-2 py-2.5 align-middle sm:px-3';

/**
 * Ngày trong bảng: `dd/mm`, phần `/yyyy` ẩn trên điện thoại —
 * bảng tiền hẹp, năm là thứ bỏ được đầu tiên.
 */
export function DayCell({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <>—</>;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return (
    <>
      {d}/{m}
      <span className="hidden sm:inline">/{y}</span>
    </>
  );
}

/**
 * Sửa/Xoá cuối dòng. Điện thoại: icon và luôn hiện (không có hover để rê chuột).
 * Màn rộng: chữ, chỉ hiện khi rê vào dòng cho bảng đỡ rối.
 */
export function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="flex justify-end gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
      <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Sửa">
        <Pencil size={14} className="sm:hidden" />
        <span className="hidden sm:inline">Sửa</span>
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Xoá">
        <Trash2 size={14} className="sm:hidden" />
        <span className="hidden sm:inline">Xoá</span>
      </Button>
    </span>
  );
}

/**
 * Cột phụ: ẩn trên điện thoại để bảng không phải cuộn ngang.
 * Chỉ dùng cho thông tin đã có ở chỗ khác hoặc không cần khi lướt nhanh.
 */
export const colSm = 'hidden sm:table-cell';
export const colMd = 'hidden md:table-cell';

/* ---------- khối ---------- */

export function Card({
  title,
  hint,
  actions,
  children,
  flush,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Bỏ padding trong, dùng khi nội dung là bảng tràn viền. */
  flush?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'p-4'}>{children}</div>
    </section>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        {children}
      </h2>
      {hint && <span className="text-xs text-faint">— {hint}</span>}
    </div>
  );
}

/* ---------- điều khiển ---------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'soft';
  size?: 'sm' | 'md';
};

export function Button({
  variant = 'outline',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-ink shadow-card',
    outline: 'border border-line-strong bg-surface hover:bg-canvas',
    soft: 'bg-brand-soft text-brand-ink hover:bg-brand-soft/70',
    ghost: 'text-muted hover:bg-canvas hover:text-ink',
    danger: 'border border-out/30 text-out hover:bg-out-soft',
  }[variant];
  const pad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 ${styles} ${pad} ${className}`}
    />
  );
}

const fieldBase =
  'w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm outline-none transition-shadow placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-canvas disabled:text-muted';

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const numeric = props.type === 'number' ? 'tnum' : '';
  return <input {...props} className={`${fieldBase} ${numeric} ${className}`} />;
}

export function Select({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${className}`} />;
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
  wide,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-ink/35 backdrop-blur-[2px] sm:items-start sm:overflow-y-auto sm:p-4"
      onClick={onClose}
    >
      {/* Điện thoại: dán đáy màn hình, cao tối đa 92vh và tự cuộn phần thân —
          bàn phím bật lên vẫn thấy nút Lưu. Màn rộng: hộp giữa như cũ. */}
      <div
        className={`animate-pop flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-pop sm:mt-8 sm:mb-8 sm:max-h-none sm:rounded-2xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
          <h3 className="font-semibold">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </Button>
        </header>
        <div className="scroll-slim overflow-y-auto p-4 sm:overflow-visible sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------- hiển thị ---------- */

const vnd = new Intl.NumberFormat('vi-VN');

/**
 * `signed` ép dấu và màu theo chiều tiền; không truyền thì tự suy từ dấu của số.
 * Luôn dùng tabular-nums để các cột tiền thẳng hàng.
 */
export function Money({
  value,
  signed,
  className = '',
}: {
  value: number;
  signed?: 'in' | 'out';
  className?: string;
}) {
  const color =
    signed === 'in'
      ? 'text-in'
      : signed === 'out'
        ? 'text-out'
        : value < 0
          ? 'text-out'
          : '';
  const prefix = signed === 'in' ? '+' : signed === 'out' ? '−' : value < 0 ? '−' : '';
  return (
    <span className={`tnum ${color} ${className}`}>
      {prefix}
      {vnd.format(Math.abs(value))}
    </span>
  );
}

export type Tone = 'neutral' | 'brand' | 'in' | 'out' | 'warn';

const toneCls: Record<Tone, string> = {
  neutral: 'bg-canvas text-muted ring-line-strong',
  brand: 'bg-brand-soft text-brand-ink ring-brand/20',
  in: 'bg-in-soft text-in ring-in/20',
  out: 'bg-out-soft text-out ring-out/20',
  warn: 'bg-warn-soft text-warn ring-warn/25',
};

export function Badge({
  tone = 'neutral',
  children,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${toneCls[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({
  children,
  icon = <Inbox size={22} />,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-canvas text-faint">
        {icon}
      </span>
      <p className="max-w-sm text-sm text-muted">{children}</p>
    </div>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="relative h-8 overflow-hidden rounded-lg bg-canvas"
          style={{ opacity: 1 - i * 0.13 }}
        >
          <div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
            style={{ animation: 'shimmer 1.3s infinite' }}
          />
        </div>
      ))}
    </div>
  );
}

/** Ô số liệu lớn ở màn Tổng quan. */
export function Stat({
  label,
  value,
  tone,
  hint,
  big,
  icon,
}: {
  label: string;
  value: number | undefined;
  tone?: 'in' | 'out';
  hint?: string;
  big?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border bg-surface p-4 shadow-card ${
        big ? 'border-brand/25 ring-1 ring-brand/10' : 'border-line'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-faint">{icon}</span>}
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <div className={`mt-1.5 font-semibold ${big ? 'text-2xl' : 'text-xl'}`}>
        {value === undefined ? (
          <span className="text-faint">…</span>
        ) : (
          <>
            <Money value={value} signed={tone} />
            <span className="ml-1 text-sm font-normal text-faint">đ</span>
          </>
        )}
      </div>
      {hint && <div className="mt-1 text-[11px] text-faint">{hint}</div>}
    </div>
  );
}

export function Pager({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-xs text-muted sm:px-4">
      <span>
        <b className="tnum text-ink">{total}</b> bản ghi · trang {page}/{pages}
      </span>
      {pages > 1 && (
        <div className="flex gap-1.5">
          <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft size={14} /> Trước
          </Button>
          <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Sau <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
