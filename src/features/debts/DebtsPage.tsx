import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  DEFAULT_METHOD,
  errorMessage,
  LOAN_TYPE_LABEL,
  METHOD_LABEL,
  type Debt,
  type DebtStatus,
  type InterestMethod,
  type LoanSchedule,
  type LoanType,
  type Page,
  type Person,
  type Project,
  type SchedulePeriod,
} from '../../lib/api';
import { queryString, useFilters } from '../../lib/useFilters';
import { FilterBar, type FilterField } from '../../components/FilterBar';
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  Money,
  Pager,
  Select,
  Skeleton,
  tableCls,
  tdCls,
  theadCls,
  thCls,
  trCls,
  type Tone,
} from '../../components/ui';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { dayVN, today } from '../../lib/format';

const DEFAULTS = {
  q: '',
  direction: '',
  status: '',
  personId: '',
  projectId: '',
  from: '',
  to: '',
  dueFrom: '',
  dueTo: '',
  amountMin: '',
  amountMax: '',
  sort: 'dueDate:asc',
  page: '1',
};

type Result = Page<Debt> & {
  totals: { iOwe: number; owesMe: number; interestPaid: number };
};

const STATUS_LABEL: Record<DebtStatus, string> = {
  active: 'Đang nợ',
  overdue: 'Quá hạn',
  paid: 'Đã trả xong',
};

const STATUS_TONE: Record<DebtStatus, Tone> = {
  active: 'brand',
  overdue: 'warn',
  paid: 'neutral',
};

export function DebtsPage() {
  const { values, set, reset, activeCount } = useFilters(DEFAULTS);
  const [editing, setEditing] = useState<Debt | null | undefined>(undefined);
  const [paying, setPaying] = useState<{ debt: Debt; prefill?: Prefill } | undefined>(
    undefined,
  );
  const qc = useQueryClient();

  const people = useQuery({
    queryKey: ['people', 'all'],
    queryFn: async () => (await api.get<Page<Person>>('/people?limit=200')).data.items,
  });
  const projects = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () => (await api.get<Page<Project>>('/projects?limit=200')).data.items,
  });

  const qs = queryString(values);
  const list = useQuery({
    queryKey: ['debts', qs],
    queryFn: async () => (await api.get<Result>(`/debts?${qs}`)).data,
  });

  // Nợ sinh ra giao dịch tiền, nên đổi nợ là số dư và báo cáo cũng đổi theo.
  const invalidate = () => {
    for (const key of ['debts', 'schedule', 'people', 'transactions', 'overview', 'monthly', 'by-category', 'by-project', 'by-person', 'loans'])
      qc.invalidateQueries({ queryKey: [key] });
  };

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/debts/${id}`),
    onSuccess: invalidate,
    onError: (e) => alert(errorMessage(e)),
  });

  const fields: FilterField[] = [
    { key: 'q', label: 'Tên / ghi chú', type: 'text' },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        { value: 'active', label: 'Đang nợ' },
        { value: 'overdue', label: 'Quá hạn' },
        { value: 'paid', label: 'Đã trả xong' },
      ],
    },
    {
      key: 'direction',
      label: 'Chiều nợ',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        { value: 'i_owe', label: 'Tôi nợ' },
        { value: 'owes_me', label: 'Nợ tôi' },
      ],
    },
    {
      key: 'personId',
      label: 'Người',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        ...(people.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
      ],
    },
    {
      key: 'projectId',
      label: 'Công việc',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        { value: 'none', label: '(không thuộc việc nào)' },
        ...(projects.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
      ],
    },
    {
      key: 'sort',
      label: 'Sắp xếp',
      type: 'select',
      options: [
        { value: 'dueDate:asc', label: 'Hạn gần nhất' },
        { value: 'remaining:desc', label: 'Còn lại nhiều nhất' },
        { value: 'date:desc', label: 'Chuyển tiền mới nhất' },
        { value: 'paid:desc', label: 'Đã trả nhiều nhất' },
      ],
    },
    { key: 'from', label: 'Chuyển tiền từ', type: 'date' },
    { key: 'to', label: 'Chuyển tiền đến', type: 'date' },
    { key: 'dueFrom', label: 'Hạn từ', type: 'date' },
    { key: 'dueTo', label: 'Hạn đến', type: 'date' },
    { key: 'amountMin', label: 'Còn lại từ', type: 'number' },
    { key: 'amountMax', label: 'Còn lại đến', type: 'number' },
  ];

  const data = list.data;
  // Không lọc trạng thái thì tách 3 nhóm cho rõ; có lọc rồi thì hiện phẳng.
  const groups: [DebtStatus, Debt[]][] = values.status
    ? [[values.status as DebtStatus, data?.items ?? []]]
    : (['overdue', 'active', 'paid'] as DebtStatus[])
        .map((s) => [s, (data?.items ?? []).filter((d) => d.status === s)] as [DebtStatus, Debt[]])
        .filter(([, rows]) => rows.length > 0);

  return (
    <>
      <FilterBar
        fields={fields}
        values={values}
        onChange={set}
        onReset={reset}
        activeCount={activeCount}
      >
        <Button
          variant="primary"
          onClick={() =>
            people.data?.length
              ? setEditing(null)
              : alert('Thêm người ở tab "Người" trước đã.')
          }
        >
          <Plus size={15} /> Thêm khoản nợ
        </Button>
      </FilterBar>

      <Card
        title={
          data ? (
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-normal">
              <span>
                Tôi đang nợ{' '}
                <Money value={data.totals.iOwe} signed="out" className="font-semibold" />
              </span>
              <span>
                Đang nợ tôi{' '}
                <Money value={data.totals.owesMe} signed="in" className="font-semibold" />
              </span>
              <span className="text-muted">
                Lãi vay đã trả <Money value={data.totals.interestPaid} />
              </span>
            </span>
          ) : (
            'Nợ'
          )
        }
      >
        {list.isLoading ? (
          <Skeleton rows={3} />
        ) : !data?.items.length ? (
          <Empty>Không có khoản nợ nào khớp bộ lọc.</Empty>
        ) : (
          <div className="space-y-5">
            {groups.map(([status, rows]) => (
              <div key={status}>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  {STATUS_LABEL[status]}
                  <span className="rounded bg-canvas px-1.5 py-0.5 text-[11px] text-faint">
                    {rows.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {rows.map((d) => (
                    <DebtRow
                      key={d.id}
                      debt={d}
                      onEdit={() => setEditing(d)}
                      onPay={(prefill) => setPaying({ debt: d, prefill })}
                      onDelete={() =>
                        confirm(`Xoá khoản nợ của ${d.person.name}?`) && remove.mutate(d.id)
                      }
                      onChanged={invalidate}
                    />
                  ))}
                </div>
              </div>
            ))}
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
        <DebtForm
          value={editing}
          people={people.data ?? []}
          projects={projects.data ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            invalidate();
          }}
        />
      )}

      {paying && (
        <PaymentForm
          debt={paying.debt}
          prefill={paying.prefill}
          onClose={() => setPaying(undefined)}
          onSaved={() => {
            setPaying(undefined);
            invalidate();
          }}
        />
      )}
    </>
  );
}

function DebtRow({
  debt,
  onEdit,
  onPay,
  onDelete,
  onChanged,
}: {
  debt: Debt;
  onEdit: () => void;
  onPay: (prefill?: Prefill) => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);

  const removePayment = useMutation({
    mutationFn: (paymentId: number) => api.delete(`/debts/${debt.id}/payments/${paymentId}`),
    onSuccess: onChanged,
    onError: (e) => alert(errorMessage(e)),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        <button
          className="flex items-center gap-1.5 font-semibold hover:text-brand"
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          {debt.person.name}
        </button>
        <Badge tone={debt.direction === 'i_owe' ? 'out' : 'in'}>
          {debt.direction === 'i_owe' ? 'Tôi nợ' : 'Nợ tôi'}
        </Badge>
        <Badge tone={STATUS_TONE[debt.status]}>{STATUS_LABEL[debt.status]}</Badge>
        {!debt.affectsBalance && (
          <Badge title="Khoản vay cũ: tiền đã tiêu hết nên không cộng vào số dư">
            Không tính vào số dư
          </Badge>
        )}
        {debt.loanType !== 'personal' && (
          <Badge tone="brand">{LOAN_TYPE_LABEL[debt.loanType]}</Badge>
        )}
        {debt.project && (
          <span className="text-xs text-faint">việc: {debt.project.name}</span>
        )}

        <span className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-right">
            <span className="block text-[10px] uppercase tracking-wide text-faint">Gốc</span>
            <Money value={debt.principal} />
          </span>
          <span className="text-right">
            <span className="block text-[10px] uppercase tracking-wide text-faint">Đã trả</span>
            <Money value={debt.paid} />
          </span>
          <span className="text-right">
            <span className="block text-[10px] uppercase tracking-wide text-faint">Còn lại</span>
            <Money value={debt.remaining} className="font-semibold" />
          </span>
        </span>

        <span className="flex gap-1">
          {debt.status !== 'paid' && (
            <Button variant="primary" size="sm" onClick={() => onPay()}>
              Ghi trả
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Sửa
          </Button>
          {debt.payments.length === 0 && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              Xoá
            </Button>
          )}
        </span>
      </div>

      {open && (
        <div className="border-t border-line bg-canvas px-3 py-3 text-sm">
          <div className="mb-3 text-xs text-muted">
            Chuyển tiền {dayVN(debt.date)} · Hạn {dayVN(debt.dueDate)}
            {debt.interestNote ? ` · Lãi: ${debt.interestNote}` : ''}
            {debt.interestPaid ? ` · Đã trả lãi ${debt.interestPaid.toLocaleString('vi-VN')}` : ''}
            {debt.note ? ` · ${debt.note}` : ''}
          </div>
          {debt.interestMethod !== 'none' && (
            <ScheduleTable
              debtId={debt.id}
              onPayPeriod={(p) =>
                onPay({ principalAmount: p.principal, interestAmount: p.interest })
              }
            />
          )}

          {!debt.payments.length ? (
            <p className="text-xs text-faint">Chưa có lần trả nào.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <table className={tableCls}>
                <thead className={theadCls}>
                  <tr>
                    <th className={thCls}>Đã trả ngày</th>
                    <th className={`${thCls} text-right`}>Gốc</th>
                    <th className={`${thCls} text-right`}>Lãi</th>
                    <th className={thCls}>Ghi chú</th>
                    <th className={thCls} />
                  </tr>
                </thead>
                <tbody>
                  {debt.payments.map((p) => (
                    <tr key={p.id} className={trCls}>
                      <td className={`${tdCls} tnum whitespace-nowrap`}>{dayVN(p.date)}</td>
                      <td className={`${tdCls} text-right`}>
                        <Money value={p.principalAmount} />
                      </td>
                      <td className={`${tdCls} text-right text-muted`}>
                        {p.interestAmount ? (
                          <Money value={p.interestAmount} />
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className={`${tdCls} text-muted`}>{p.note ?? ''}</td>
                      <td className={`${tdCls} text-right`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            confirm('Xoá lần trả này? Giao dịch tiền tương ứng cũng bị xoá.') &&
                            removePayment.mutate(p.id)
                          }
                        >
                          Xoá
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Số tiền điền sẵn khi ghi trả từ một kỳ trong lịch. */
type Prefill = { principalAmount: number; interestAmount: number };

const PERIOD_BADGE: Record<SchedulePeriod['status'], { label: string; tone: Tone }> = {
  paid: { label: 'Đã thanh toán', tone: 'in' },
  partial: { label: 'Trả thiếu', tone: 'warn' },
  late: { label: 'Quá hạn chưa trả', tone: 'out' },
  upcoming: { label: 'Chưa đến hạn', tone: 'neutral' },
};

/** Lịch dự kiến, chỉ để đối chiếu — tiền chỉ vào sổ khi bạn bấm "Ghi trả". */
function ScheduleTable({
  debtId,
  onPayPeriod,
}: {
  debtId: number;
  onPayPeriod: (p: SchedulePeriod) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const q = useQuery({
    queryKey: ['schedule', debtId],
    queryFn: async () => (await api.get<LoanSchedule>(`/debts/${debtId}/schedule`)).data,
  });

  if (q.isLoading) return <Skeleton rows={3} />;
  if (q.isError || !q.data) return null;

  const { periods, summary } = q.data;
  const firstUnpaid = Math.max(0, periods.findIndex((p) => p.status !== 'paid'));
  const shown = showAll ? periods : periods.slice(firstUnpaid, firstUnpaid + 6);
  const donePct = summary.totalPayment
    ? Math.min(100, Math.round((summary.paidTotal / summary.totalPayment) * 100))
    : 0;

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Lịch trả dự kiến
          </span>
          {summary.nextDueDate && (
            <span className="text-xs text-muted">
              Kỳ tới {dayVN(summary.nextDueDate)}:{' '}
              <Money value={summary.nextPayment} className="font-semibold text-ink" />
            </span>
          )}
          {summary.overdueAmount > 0 && (
            <Badge tone="out">
              Đang thiếu {summary.overdueAmount.toLocaleString('vi-VN')}
            </Badge>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Thu gọn' : `Xem cả ${periods.length} kỳ`}
          </Button>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-brand" style={{ width: `${donePct}%` }} />
          </div>
          <span className="tnum text-[11px] text-muted">
            đã trả {summary.paidTotal.toLocaleString('vi-VN')} /{' '}
            {summary.totalPayment.toLocaleString('vi-VN')} ({donePct}%)
          </span>
        </div>
        <p className="mt-1 text-[11px] text-faint">
          Gốc {summary.totalPrincipal.toLocaleString('vi-VN')} + lãi{' '}
          {summary.totalInterest.toLocaleString('vi-VN')}
        </p>
      </div>

      <div className="scroll-slim overflow-x-auto">
        <table className={tableCls}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Kỳ</th>
              <th className={thCls}>Đến hạn</th>
              <th className={`${thCls} text-right`}>Dư nợ đầu kỳ</th>
              <th className={`${thCls} text-right`}>Gốc</th>
              <th className={`${thCls} text-right`}>Lãi</th>
              <th className={`${thCls} text-right`}>Phải trả</th>
              <th className={thCls}>Tình trạng</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.index} className={`${trCls} group`}>
                <td className={`${tdCls} tnum text-faint`}>{p.index}</td>
                <td className={`${tdCls} tnum whitespace-nowrap`}>{dayVN(p.dueDate)}</td>
                <td className={`${tdCls} text-right text-muted`}>
                  <Money value={p.opening} />
                </td>
                <td className={`${tdCls} text-right`}>
                  <Money value={p.principal} />
                </td>
                <td className={`${tdCls} text-right`}>
                  <Money value={p.interest} />
                </td>
                <td className={`${tdCls} text-right font-semibold`}>
                  <Money value={p.payment} />
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>
                  <Badge tone={PERIOD_BADGE[p.status].tone}>
                    {PERIOD_BADGE[p.status].label}
                  </Badge>
                  {p.shortfall > 0 && p.status === 'partial' && (
                    <span className="tnum ml-1 text-[11px] text-warn">
                      còn {p.shortfall.toLocaleString('vi-VN')}
                    </span>
                  )}
                </td>
                <td className={`${tdCls} text-right whitespace-nowrap`}>
                  {p.status !== 'paid' && (
                    // Trả sớm vẫn bấm được — đối chiếu tính theo luỹ kế, không theo ngày.
                    <Button
                      size="sm"
                      variant="soft"
                      className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      onClick={() => onPayPeriod(p)}
                    >
                      Ghi trả kỳ này
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DebtForm({
  value,
  people,
  projects,
  onClose,
  onSaved,
}: {
  value: Debt | null;
  people: Person[];
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    personId: value ? String(value.personId) : '',
    direction: value?.direction ?? ('i_owe' as 'i_owe' | 'owes_me'),
    principal: value ? String(value.principal) : '',
    date: value ? value.date.slice(0, 10) : today(),
    dueDate: value?.dueDate ? value.dueDate.slice(0, 10) : '',
    affectsBalance: value ? value.affectsBalance : true,
    loanType: value?.loanType ?? ('personal' as LoanType),
    interestMethod: value?.interestMethod ?? ('none' as InterestMethod),
    interestRate: value?.interestRate != null ? String(value.interestRate) : '',
    fixedInterestAmount:
      value?.fixedInterestAmount != null ? String(value.fixedInterestAmount) : '',
    contractPayment: value?.contractPayment != null ? String(value.contractPayment) : '',
    contractLastPayment:
      value?.contractLastPayment != null ? String(value.contractLastPayment) : '',
    termMonths: value?.termMonths != null ? String(value.termMonths) : '',
    paymentDay: value?.paymentDay != null ? String(value.paymentDay) : '',
    interestNote: value?.interestNote ?? '',
    projectId: value?.projectId ? String(value.projectId) : '',
    note: value?.note ?? '',
  });

  const needsRate = ['flat', 'declining', 'annuity'].includes(form.interestMethod);
  const needsFixed = form.interestMethod === 'fixed';
  const needsContract = form.interestMethod === 'contract';
  const hasSchedule = form.interestMethod !== 'none';

  /** Đổi loại vay thì kéo theo cách tính lãi thông dụng của loại đó. */
  const pickLoanType = (loanType: LoanType) =>
    setForm({ ...form, loanType, interestMethod: DEFAULT_METHOD[loanType] });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        personId: Number(form.personId),
        direction: form.direction,
        principal: Number(form.principal),
        date: form.date,
        dueDate: form.dueDate || null,
        affectsBalance: form.affectsBalance,
        loanType: form.loanType,
        interestMethod: form.interestMethod,
        interestRate: needsRate ? Number(form.interestRate) : null,
        fixedInterestAmount: needsFixed ? Number(form.fixedInterestAmount) : null,
        contractPayment: needsContract ? Number(form.contractPayment) : null,
        contractLastPayment:
          needsContract && form.contractLastPayment
            ? Number(form.contractLastPayment)
            : null,
        termMonths: form.termMonths ? Number(form.termMonths) : null,
        paymentDay: form.paymentDay ? Number(form.paymentDay) : null,
        interestNote: form.interestNote || null,
        projectId: form.projectId ? Number(form.projectId) : null,
        note: form.note || undefined,
      };
      return value ? api.patch(`/debts/${value.id}`, body) : api.post('/debts', body);
    },
    onSuccess: onSaved,
    onError: (e) => alert(errorMessage(e)),
  });

  return (
    <Modal open title={value ? 'Sửa khoản nợ' : 'Thêm khoản nợ'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Người">
          <Select
            required
            value={form.personId}
            onChange={(e) => setForm({ ...form, personId: e.target.value })}
          >
            <option value="">— chọn —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Chiều nợ">
            <Select
              disabled={!!value}
              value={form.direction}
              onChange={(e) =>
                setForm({ ...form, direction: e.target.value as 'i_owe' | 'owes_me' })
              }
            >
              <option value="i_owe">Tôi nợ họ (đi vay)</option>
              <option value="owes_me">Họ nợ tôi (cho vay)</option>
            </Select>
          </Field>
          <Field label="Số tiền gốc (VND)">
            <Input
              type="number"
              min={1}
              required
              value={form.principal}
              onChange={(e) => setForm({ ...form, principal: e.target.value })}
            />
          </Field>
          <Field label="Ngày chuyển tiền">
            <Input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Hạn trả (có thể bỏ trống)">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </Field>
        </div>
        {form.direction === 'i_owe' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại vay">
                <Select
                  value={form.loanType}
                  onChange={(e) => pickLoanType(e.target.value as LoanType)}
                >
                  {Object.entries(LOAN_TYPE_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Cách tính lãi">
                <Select
                  value={form.interestMethod}
                  onChange={(e) =>
                    setForm({ ...form, interestMethod: e.target.value as InterestMethod })
                  }
                >
                  {Object.entries(METHOD_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {hasSchedule && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-canvas p-3">
                {needsRate && (
                  <Field label="Lãi suất (%/tháng)">
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      value={form.interestRate}
                      onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                    />
                  </Field>
                )}
                {needsFixed && (
                  <Field label="Tiền lãi mỗi tháng (VND)">
                    <Input
                      type="number"
                      min={0}
                      required
                      value={form.fixedInterestAmount}
                      onChange={(e) =>
                        setForm({ ...form, fixedInterestAmount: e.target.value })
                      }
                    />
                  </Field>
                )}
                {needsContract && (
                  <>
                    <Field label="Phải trả mỗi kỳ (VND)">
                      <Input
                        type="number"
                        min={0}
                        required
                        value={form.contractPayment}
                        onChange={(e) =>
                          setForm({ ...form, contractPayment: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Kỳ cuối (bỏ trống = như các kỳ trước)">
                      <Input
                        type="number"
                        min={0}
                        value={form.contractLastPayment}
                        onChange={(e) =>
                          setForm({ ...form, contractLastPayment: e.target.value })
                        }
                      />
                    </Field>
                    <p className="col-span-2 text-xs text-muted">
                      Chép đúng số trong sao kê của bên cho vay. Mỗi bên làm tròn một
                      kiểu nên chỉ cách này mới khớp tuyệt đối; app tự suy ra tiền lãi
                      = tiền trả − gốc.
                    </p>
                  </>
                )}
                <Field label="Số kỳ trả (tháng)">
                  <Input
                    type="number"
                    min={1}
                    required={needsRate}
                    placeholder={needsFixed ? 'bỏ trống = không kỳ hạn' : ''}
                    value={form.termMonths}
                    onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
                  />
                </Field>
                <Field label="Ngày trả hàng tháng">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="theo ngày chuyển tiền"
                    value={form.paymentDay}
                    onChange={(e) => setForm({ ...form, paymentDay: e.target.value })}
                  />
                </Field>
              </div>
            )}

            <Field label="Ghi chú lãi suất (vd: 2%/tháng đầu rồi thả nổi)">
              <Input
                value={form.interestNote}
                onChange={(e) => setForm({ ...form, interestNote: e.target.value })}
              />
            </Field>
          </>
        )}
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
        <Field label="Ghi chú">
          <Input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Field>
        <label className="flex cursor-pointer gap-2.5 rounded-lg border border-line bg-canvas p-3 transition-colors hover:border-line-strong">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[oklch(0.53_0.185_274)]"
            checked={form.affectsBalance}
            onChange={(e) => setForm({ ...form, affectsBalance: e.target.checked })}
          />
          <span className="text-sm">
            <span className="font-medium">
              Cộng tiền {form.direction === 'i_owe' ? 'vay' : 'cho vay'} vào số dư hiện tại
            </span>
            <span className="mt-1 block text-xs text-muted">
              {form.affectsBalance ? (
                <>
                  Lưu xong sẽ tạo một giao dịch tiền{' '}
                  {form.direction === 'i_owe' ? 'vào' : 'ra'}{' '}
                  <Money value={Number(form.principal || 0)} /> đ. Dùng khi vừa{' '}
                  {form.direction === 'i_owe' ? 'nhận tiền vay' : 'đưa tiền'} xong.
                </>
              ) : (
                <>
                  Không tạo giao dịch tiền, số dư giữ nguyên — chỉ theo dõi dư nợ. Dùng
                  cho khoản vay cũ mà tiền đã tiêu hết trước khi bắt đầu dùng app. Các
                  lần <b>trả nợ</b> sau này vẫn ghi vào sổ bình thường.
                </>
              )}
            </span>
          </span>
        </label>
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

function PaymentForm({
  debt,
  prefill,
  onClose,
  onSaved,
}: {
  debt: Debt;
  prefill?: Prefill;
  onClose: () => void;
  onSaved: () => void;
}) {
  const canHaveInterest = debt.direction === 'i_owe';
  const [form, setForm] = useState({
    date: today(),
    // Bấm từ một kỳ trong lịch thì điền sẵn gốc/lãi của kỳ đó.
    principalAmount: String(prefill?.principalAmount ?? debt.remaining),
    interestAmount: prefill?.interestAmount ? String(prefill.interestAmount) : '',
    note: '',
  });

  const save = useMutation({
    mutationFn: () =>
      api.post(`/debts/${debt.id}/payments`, {
        date: form.date,
        principalAmount: Number(form.principalAmount || 0),
        interestAmount: canHaveInterest ? Number(form.interestAmount || 0) : 0,
        note: form.note || undefined,
      }),
    onSuccess: onSaved,
    onError: (e) => alert(errorMessage(e)),
  });

  return (
    <Modal open title={`Ghi trả nợ — ${debt.person.name}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <p className="rounded-lg bg-canvas px-3 py-2 text-sm">
          Còn lại: <Money value={debt.remaining} className="font-semibold" /> đ
          {debt.interestNote && (
            <span className="text-muted"> · Lãi suất: {debt.interestNote}</span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày trả">
            <Input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Tiền gốc (VND)">
            <Input
              type="number"
              min={0}
              max={debt.remaining}
              value={form.principalAmount}
              onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
            />
          </Field>
        </div>
        {canHaveInterest && (
          <Field label="Tiền lãi (VND) — để trống nếu không có">
            <Input
              type="number"
              min={0}
              value={form.interestAmount}
              onChange={(e) => setForm({ ...form, interestAmount: e.target.value })}
            />
          </Field>
        )}
        <Field label="Ghi chú">
          <Input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Field>
        <p className="rounded-lg border border-line bg-canvas p-3 text-xs text-muted">
          Tiền gốc làm giảm dư nợ nhưng không tính vào lãi/lỗ. Tiền lãi thì ngược lại: là
          chi phí thật, tính vào lãi/lỗ của công việc gắn với khoản nợ.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            Ghi trả
          </Button>
        </div>
      </form>
    </Modal>
  );
}
