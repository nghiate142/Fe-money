import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Input, Select } from './ui';

export type FilterField =
  | { key: string; label: string; type: 'text' | 'date' | 'number' }
  | {
      key: string;
      label: string;
      type: 'select';
      options: { value: string; label: string }[];
    };

/**
 * Một thanh lọc dùng chung cho mọi danh sách; field do từng tab khai báo.
 * Ô tìm kiếm luôn hiện (dùng nhiều nhất), phần còn lại gập vào sau nút "Bộ lọc"
 * để không đổ 11 ô ra màn hình cùng lúc. Chip bên dưới cho biết đang lọc theo gì.
 */
export function FilterBar({
  fields,
  values,
  onChange,
  onReset,
  activeCount,
  children,
}: {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
  onReset: () => void;
  activeCount: number;
  children?: React.ReactNode;
}) {
  const search = fields.find((f) => f.type === 'text');
  const rest = fields.filter((f) => f !== search);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(search ? (values[search.key] ?? '') : '');

  // Bị reset từ ngoài (nút Xoá lọc) thì ô tìm kiếm phải theo.
  useEffect(() => {
    if (search) setDraft(values[search.key] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search && values[search.key]]);

  useEffect(() => {
    if (!search) return;
    const t = setTimeout(() => {
      if ((values[search.key] ?? '') !== draft) onChange({ [search.key]: draft });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  /** Nhãn để hiện lên chip: select thì lấy text của option đang chọn. */
  const labelOf = (f: FilterField, v: string) =>
    f.type === 'select' ? (f.options.find((o) => o.value === v)?.label ?? v) : v;

  // `sort` là tuỳ chọn hiển thị chứ không phải bộ lọc, và luôn có giá trị mặc định
  // nên không đưa lên chip.
  const chips = rest.filter((f) => f.key !== 'sort' && values[f.key]);

  return (
    <div className="mb-4 rounded-xl border border-line bg-surface p-3 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint"
            />
            <Input
              value={draft}
              placeholder={`${search.label}…`}
              className="pl-8"
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
        )}

        {rest.length > 0 && (
          <Button variant={open ? 'soft' : 'outline'} onClick={() => setOpen(!open)}>
            <SlidersHorizontal size={15} />
            Bộ lọc
            {activeCount > 0 && (
              <span className="ml-0.5 rounded bg-brand px-1.5 text-[11px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </Button>
        )}

        <div className="ml-auto flex gap-2">{children}</div>
      </div>

      {open && rest.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-3 lg:grid-cols-4">
          {rest.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs font-medium text-muted">{f.label}</span>
              {f.type === 'select' ? (
                <Select
                  value={values[f.key] ?? ''}
                  onChange={(e) => onChange({ [f.key]: e.target.value })}
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={f.type === 'date' ? 'date' : 'number'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => onChange({ [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
      )}

      {(chips.length > 0 || activeCount > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {chips.map((f) => (
            <button
              key={f.key}
              onClick={() => onChange({ [f.key]: '' })}
              className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand-ink transition-colors hover:bg-brand/15"
            >
              {f.label}: {labelOf(f, values[f.key])}
              <X size={12} />
            </button>
          ))}
          <button
            onClick={onReset}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            Xoá tất cả
          </button>
        </div>
      )}
    </div>
  );
}
