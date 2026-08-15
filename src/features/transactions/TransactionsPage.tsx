import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  errorMessage,
  type Category,
  type Currency as CurrencyMeta,
  type Page,
  type Person,
  type Project,
  type RateResult,
  type Transaction,
} from '../../lib/api';

/** Đơn vị nhỏ nhất -> đơn vị lớn để hiển thị (12050 cent -> 120.5 USD). */
function toMajor(minor: number, code: string, currencies?: CurrencyMeta[]) {
  const decimals = currencies?.find((c) => c.code === code)?.decimals ?? 0;
  return minor / 10 ** decimals;
}
import { queryString, useFilters } from '../../lib/useFilters';
import { FilterBar, type FilterField } from '../../components/FilterBar';
import {
  Badge,
  Button,
  Card,
  colMd,
  Empty,
  Field,
  Input,
  Modal,
  DayCell,
  Money,
  Pager,
  RowActions,
  Select,
  Skeleton,
  tableCls,
  tdCls,
  theadCls,
  thCls,
  trCls,
} from '../../components/ui';
import { Download, Plus } from 'lucide-react';
import { today } from '../../lib/format';

const DEFAULTS = {
  q: '',
  kind: '',
  nature: '',
  scope: '',
  categoryId: '',
  projectId: '',
  personId: '',
  from: '',
  to: '',
  amountMin: '',
  amountMax: '',
  sort: 'date:desc',
  page: '1',
};

type Result = Page<Transaction> & {
  totals: {
    income: number;
    expense: number;
    pnlIncome: number;
    pnlExpense: number;
  };
};

const NATURE_LABEL: Record<string, string> = {
  operating: 'Kinh doanh',
  financing: 'Vay / trả gốc',
  interest: 'Lãi vay',
};

export function TransactionsPage() {
  const { values, set, reset, activeCount } = useFilters(DEFAULTS);
  const [editing, setEditing] = useState<Transaction | null | undefined>(undefined);
  const qc = useQueryClient();

  const categories = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () =>
      (await api.get<Page<Category>>('/categories?limit=200')).data.items,
  });
  const projects = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () =>
      (await api.get<Page<Project>>('/projects?limit=200')).data.items,
  });
  const people = useQuery({
    queryKey: ['people', 'all'],
    queryFn: async () => (await api.get<Page<Person>>('/people?limit=200')).data.items,
  });

  const qs = queryString(values);
  const list = useQuery({
    queryKey: ['transactions', qs],
    queryFn: async () => (await api.get<Result>(`/transactions?${qs}`)).data,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: (e) => alert(errorMessage(e)),
  });

  const fields: FilterField[] = [
    { key: 'q', label: 'Ghi chú', type: 'text' },
    {
      key: 'kind',
      label: 'Loại',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        { value: 'income', label: 'Tiền vào' },
        { value: 'expense', label: 'Tiền ra' },
      ],
    },
    {
      key: 'nature',
      label: 'Bản chất',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        { value: 'operating', label: 'Kinh doanh / tiêu dùng' },
        { value: 'financing', label: 'Vay / trả gốc' },
        { value: 'interest', label: 'Lãi vay' },
      ],
    },
    {
      key: 'scope',
      label: 'Phạm vi',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        { value: 'project', label: 'Thuộc công việc' },
        { value: 'personal', label: 'Cá nhân / hằng ngày' },
      ],
    },
    {
      key: 'categoryId',
      label: 'Danh mục',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        ...(categories.data ?? []).map((c) => ({
          value: String(c.id),
          label: c.name,
        })),
      ],
    },
    {
      key: 'projectId',
      label: 'Công việc',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        { value: 'none', label: '(không thuộc việc nào)' },
        ...(projects.data ?? []).map((p) => ({
          value: String(p.id),
          label: p.name,
        })),
      ],
    },
    {
      key: 'personId',
      label: 'Người',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        { value: 'none', label: '(không gắn ai)' },
        ...(people.data ?? []).map((p) => ({
          value: String(p.id),
          label: p.name,
        })),
      ],
    },
    {
      key: 'sort',
      label: 'Sắp xếp',
      type: 'select',
      options: [
        { value: 'date:desc', label: 'Ngày mới nhất' },
        { value: 'date:asc', label: 'Ngày cũ nhất' },
        { value: 'amount:desc', label: 'Tiền nhiều nhất' },
        { value: 'amount:asc', label: 'Tiền ít nhất' },
      ],
    },
    { key: 'from', label: 'Từ ngày', type: 'date' },
    { key: 'to', label: 'Đến ngày', type: 'date' },
    { key: 'amountMin', label: 'Tiền từ', type: 'number' },
    { key: 'amountMax', label: 'Tiền đến', type: 'number' },
  ];

  const data = list.data;

  return (
    <>
      <FilterBar
        fields={fields}
        values={values}
        onChange={set}
        onReset={reset}
        activeCount={activeCount}
      >
        <Button variant="primary" onClick={() => setEditing(null)}>
          <Plus size={15} /> Thêm giao dịch
        </Button>
        <Button onClick={() => downloadCsv(qs)}>
          <Download size={15} /> CSV
        </Button>
      </FilterBar>

      <Card
        flush
        title={
          data ? (
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-normal">
              <span>
                Vào{' '}
                <Money
                  value={data.totals.income}
                  signed="in"
                  className="font-semibold"
                />
              </span>
              <span>
                Ra{' '}
                <Money
                  value={data.totals.expense}
                  signed="out"
                  className="font-semibold"
                />
              </span>
              <span className="text-muted">
                Chênh lệch{' '}
                <Money
                  value={data.totals.income - data.totals.expense}
                  className="font-semibold text-ink"
                />
              </span>
            </span>
          ) : (
            'Giao dịch'
          )
        }
        hint={
          data
            ? `Lãi/lỗ (không tính vay & trả gốc): ${new Intl.NumberFormat('vi-VN').format(data.totals.pnlIncome - data.totals.pnlExpense)} đ`
            : undefined
        }
      >
        {list.isLoading ? (
          <div className="p-4">
            <Skeleton />
          </div>
        ) : !data?.items.length ? (
          <Empty>Không có giao dịch nào khớp bộ lọc.</Empty>
        ) : (
          <div className="scroll-slim overflow-x-auto">
            <table className={tableCls}>
              <thead className={theadCls}>
                <tr>
                  <th className={thCls}>Ngày</th>
                  <th className={thCls}>Danh mục</th>
                  <th className={`${thCls} ${colMd}`}>Công việc</th>
                  <th className={`${thCls} ${colMd}`}>Ghi chú</th>
                  <th className={`${thCls} text-right`}>Số tiền</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((t) => {
                  const fromDebt = !!(t.debtId || t.debtPaymentId);
                  return (
                    <tr key={t.id} className={`${trCls} group`}>
                      <td className={`${tdCls} tnum whitespace-nowrap text-muted`}>
                        <DayCell iso={t.date} />
                      </td>
                      {/* max-w để dòng phụ dài không kéo giãn bảng ra ngoài màn hình. */}
                      <td className={`${tdCls} max-w-[34vw] md:max-w-none`}>
                        <span className="font-medium">{t.category?.name}</span>
                        {/* Cột Công việc / Ghi chú bị ẩn trên điện thoại — gộp vào đây. */}
                        <div className="truncate text-[11px] text-faint md:hidden">
                          {[t.project?.name, t.person?.name, t.note]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                        {t.nature !== 'operating' &&
                          NATURE_LABEL[t.nature] !== t.category?.name && (
                            <Badge tone={t.nature === 'interest' ? 'warn' : 'brand'}>
                              {NATURE_LABEL[t.nature]}
                            </Badge>
                          )}
                      </td>
                      <td className={`${tdCls} ${colMd} text-muted`}>
                        {t.project?.name ?? <span className="text-faint">Cá nhân</span>}
                        {t.person && (
                          <div className="text-[11px] text-faint">{t.person.name}</div>
                        )}
                      </td>
                      <td
                        className={`${tdCls} ${colMd} max-w-[22ch] truncate text-muted`}
                        title={t.note ?? ''}
                      >
                        {t.note ?? ''}
                      </td>
                      <td className={`${tdCls} text-right whitespace-nowrap`}>
                        <Money
                          value={t.amount}
                          signed={t.kind === 'income' ? 'in' : 'out'}
                          className="font-semibold"
                        />
                        {t.currency !== 'VND' && (
                          // Số quy đổi là số vào sổ; số gốc chỉ để đối chiếu hoá đơn.
                          <div
                            className="tnum text-[11px] whitespace-normal text-faint"
                            title={`Tỷ giá ${t.rate.toLocaleString('vi-VN')}`}
                          >
                            {(t.originalAmount / 100).toLocaleString('vi-VN', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            {t.currency}
                            {/* Tỷ giá dài, chỉ hiện khi đủ chỗ. */}
                            <span className="hidden sm:inline">
                              {' '}
                              @ {t.rate.toLocaleString('vi-VN')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className={`${tdCls} text-right whitespace-nowrap`}>
                        {fromDebt ? (
                          // Sửa ở đây sẽ làm dư nợ lệch với sổ tiền — chỉ sửa qua tab Nợ.
                          <Badge title="Sinh tự động từ khoản nợ, sửa ở tab Nợ">
                            từ khoản nợ
                          </Badge>
                        ) : (
                          <RowActions
                            onEdit={() => setEditing(t)}
                            onDelete={() =>
                              confirm('Xoá giao dịch này?') && remove.mutate(t.id)
                            }
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <Pager
            page={data.page}
            limit={data.limit}
            total={data.total}
            onPage={(p) => set({ page: String(p) })}
          />
        )}
      </Card>

      {editing !== undefined && (
        <TransactionForm
          value={editing}
          categories={categories.data ?? []}
          projects={projects.data ?? []}
          people={people.data ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            qc.invalidateQueries({ queryKey: ['transactions'] });
          }}
        />
      )}
    </>
  );
}

async function downloadCsv(qs: string) {
  const res = await api.get(`/reports/export.csv?${qs}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'giao-dich.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function TransactionForm({
  value,
  categories,
  projects,
  people,
  onClose,
  onSaved,
}: {
  value: Transaction | null;
  categories: Category[];
  projects: Project[];
  people: Person[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const currencies = useQuery({
    queryKey: ['currencies'],
    queryFn: async () =>
      (await api.get<CurrencyMeta[]>('/exchange-rates/currencies')).data,
  });

  const [form, setForm] = useState({
    date: value ? value.date.slice(0, 10) : today(),
    kind: value?.kind ?? ('expense' as 'income' | 'expense'),
    currency: value?.currency ?? 'VND',
    // Hiển thị theo đơn vị lớn: USD nhập 120.50, VND nhập 3000000.
    amount: value
      ? String(toMajor(value.originalAmount, value.currency, currencies.data))
      : '',
    rate: value ? String(value.rate) : '',
    // Phí luôn tính bằng VND — ngân hàng thu phí bằng tiền Việt.
    fee: value?.fee ? String(value.fee) : '',
    categoryId: value ? String(value.categoryId) : '',
    projectId: value?.projectId ? String(value.projectId) : '',
    personId: value?.personId ? String(value.personId) : '',
    note: value?.note ?? '',
  });

  const decimals =
    currencies.data?.find((c) => c.code === form.currency)?.decimals ?? 0;
  const isForeign = form.currency !== 'VND';

  // Đổi loại tiền hoặc ngày thì lấy lại tỷ giá của đúng ngày đó.
  const rateQuery = useQuery({
    queryKey: ['rate', form.currency, form.date],
    enabled: isForeign,
    queryFn: async () =>
      (
        await api.get<RateResult>(
          `/exchange-rates/resolve?currency=${form.currency}&date=${form.date}`,
        )
      ).data,
  });

  useEffect(() => {
    if (rateQuery.data) setForm((f) => ({ ...f, rate: String(rateQuery.data.rate) }));
  }, [rateQuery.data]);

  const rate = isForeign ? Number(form.rate || 0) : 1;
  const fee = Math.round(Number(form.fee || 0));
  const preview = Math.round(Number(form.amount || 0) * rate) + fee;

  const save = useMutation({
    mutationFn: () => {
      const body = {
        date: form.date,
        kind: form.kind,
        // Gửi theo đơn vị nhỏ nhất để không mất số lẻ khi truyền.
        amount: Math.round(Number(form.amount) * 10 ** decimals),
        currency: form.currency,
        ...(isForeign ? { rate } : {}),
        fee,
        categoryId: Number(form.categoryId),
        projectId: form.projectId ? Number(form.projectId) : null,
        personId: form.personId ? Number(form.personId) : null,
        note: form.note || undefined,
      };
      return value
        ? api.patch(`/transactions/${value.id}`, body)
        : api.post('/transactions', body);
    },
    onSuccess: onSaved,
    onError: (e) => alert(errorMessage(e)),
  });

  // Đúng chiều tiền, và bỏ danh mục hệ thống (Vay nợ, Trả nợ gốc…) vì
  // chúng chỉ dùng cho giao dịch tự sinh từ khoản nợ.
  const options = categories.filter((c) => c.kind === form.kind && !c.code);

  return (
    <Modal open title={value ? 'Sửa giao dịch' : 'Thêm giao dịch'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Ngày">
            <Input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Loại">
            <Select
              value={form.kind}
              onChange={(e) =>
                setForm({
                  ...form,
                  kind: e.target.value as 'income' | 'expense',
                  categoryId: '',
                })
              }
            >
              <option value="expense">Tiền ra</option>
              <option value="income">Tiền vào</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Tiền tệ">
            <Select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value, rate: '' })}
            >
              {(currencies.data ?? [{ code: 'VND', name: 'VND', decimals: 0 }]).map(
                (c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <div className="col-span-2">
            <Field label={`Số tiền (${form.currency})`}>
              <Input
                type="number"
                step={decimals ? 0.01 : 1}
                min={decimals ? 0.01 : 1}
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <Field label="Phí giao dịch (VND, bỏ trống nếu không có)">
          <Input
            type="number"
            min={0}
            step={1000}
            placeholder="0"
            value={form.fee}
            onChange={(e) => setForm({ ...form, fee: e.target.value })}
          />
        </Field>
        {!isForeign && fee > 0 && (
          <p className="text-sm">
            Ghi vào sổ: <Money value={preview} className="font-semibold" /> đ
          </p>
        )}

        {isForeign && (
          <div className="rounded-lg border border-line bg-canvas p-3">
            <Field label={`Tỷ giá 1 ${form.currency} = ? VND`}>
              <Input
                type="number"
                step="0.0001"
                required
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
            </Field>
            <p className="mt-1.5 text-xs text-muted">
              {rateQuery.isLoading
                ? 'Đang lấy tỷ giá…'
                : rateQuery.isError
                  ? 'Không lấy được tỷ giá tự động — nhập tay ở trên.'
                  : rateQuery.data && (
                      <>
                        {
                          {
                            api: 'Vừa lấy từ API',
                            cache: 'Tỷ giá đã lưu của ngày này',
                            manual: 'Tỷ giá bạn tự nhập',
                            nearest: '⚠ Không gọi được API, đang dùng tỷ giá gần nhất',
                          }[rateQuery.data.source]
                        }{' '}
                        · sửa được nếu muốn dùng tỷ giá ngân hàng
                      </>
                    )}
            </p>
            <p className="mt-2 border-t border-line pt-2 text-sm">
              Ghi vào sổ: <Money value={preview} className="font-semibold" /> đ
              {fee > 0 && (
                <span className="text-muted">
                  {' '}
                  (gồm {fee.toLocaleString('vi-VN')} đ phí)
                </span>
              )}
            </p>
          </div>
        )}
        <Field label="Danh mục">
          <Select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">— chọn —</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Thuộc công việc (có thể bỏ trống)">
          <Select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">— không thuộc việc nào —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Người (có thể bỏ trống)"
          hint="Trả cho ai / nhận từ ai — chỉ để thống kê, không đụng tới dư nợ"
        >
          <Select
            value={form.personId}
            onChange={(e) => setForm({ ...form, personId: e.target.value })}
          >
            <option value="">— không gắn ai —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ghi chú">
          <Input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
