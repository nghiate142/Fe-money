import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import {
  api,
  LOAN_TYPE_LABEL,
  METHOD_LABEL,
  type Category,
  type InterestMethod,
  type LoanType,
  type Page,
  type Person,
  type Project,
} from '../../lib/api';
import { dayVN } from '../../lib/format';
import { queryString, useFilters } from '../../lib/useFilters';
import { FilterBar, type FilterField } from '../../components/FilterBar';
import {
  Badge,
  Card,
  Empty,
  Money,
  SectionTitle,
  Stat,
  tableCls,
  colMd,
  colSm,
  tdCls,
  theadCls,
  thCls,
  trCls,
} from '../../components/ui';
import {
  Banknote,
  CalendarClock,
  HandCoins,
  PiggyBank,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { money } from '../../lib/format';

const DEFAULTS = {
  from: '',
  to: '',
  projectId: '',
  categoryId: '',
  personId: '',
};

const COLORS = [
  '#5b5bd6',
  '#0f9b78',
  '#e0574f',
  '#d68b1e',
  '#8b5cf6',
  '#0891b2',
  '#db2777',
];

type Block = { income: number; expense: number; net: number };
type Overview = {
  cash: Block & { balance: number };
  pnl: Block;
  business: Block;
  personal: Block;
  debts: {
    iOwe: number;
    owesMe: number;
    overdue: number;
    interestPaid: number;
  };
  netWorth: number;
};

export function OverviewPage() {
  const { values, set, reset, activeCount } = useFilters(DEFAULTS);
  const qs = queryString(values);

  // Danh sách để đổ vào ô lọc — cùng query key với các tab khác nên dùng lại cache.
  const projects = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () =>
      (await api.get<Page<Project>>('/projects?limit=200')).data.items,
  });
  const categories = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () =>
      (await api.get<Page<Category>>('/categories?limit=200')).data.items,
  });
  const people = useQuery({
    queryKey: ['people', 'all'],
    queryFn: async () => (await api.get<Page<Person>>('/people?limit=200')).data.items,
  });

  const fields: FilterField[] = [
    { key: 'from', label: 'Từ ngày', type: 'date' },
    { key: 'to', label: 'Đến ngày', type: 'date' },
    {
      key: 'projectId',
      label: 'Công việc',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        ...(projects.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
      ],
    },
    {
      key: 'categoryId',
      label: 'Danh mục',
      type: 'select',
      options: [
        { value: '', label: 'Tất cả' },
        ...(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
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
  ];

  const overview = useQuery({
    queryKey: ['overview', qs],
    queryFn: async () => (await api.get<Overview>(`/reports/overview?${qs}`)).data,
  });
  const monthly = useQuery({
    queryKey: ['monthly', qs],
    queryFn: async () =>
      (
        await api.get<{ month: string; income: number; expense: number }[]>(
          `/reports/monthly?${qs}`,
        )
      ).data,
  });
  const byCategory = useQuery({
    queryKey: ['by-category', qs],
    queryFn: async () =>
      (
        await api.get<{ name: string; kind: string; total: number }[]>(
          `/reports/by-category?${qs}`,
        )
      ).data,
  });
  const byProject = useQuery({
    queryKey: ['by-project', qs],
    queryFn: async () =>
      (
        await api.get<
          {
            projectId: number | null;
            name: string;
            income: number;
            expense: number;
            profit: number;
          }[]
        >(`/reports/by-project?${qs}`)
      ).data,
  });
  const byPerson = useQuery({
    queryKey: ['by-person', qs],
    queryFn: async () =>
      (
        await api.get<
          {
            personId: number;
            name: string;
            iOwe: number;
            owesMe: number;
            income: number;
            expense: number;
          }[]
        >(`/reports/by-person?${qs}`)
      ).data,
  });

  const loans = useQuery({
    queryKey: ['loans'],
    queryFn: async () =>
      (
        await api.get<{
          items: {
            debtId: number;
            lender: string;
            loanType: LoanType;
            interestMethod: InterestMethod;
            remaining: number;
            nextPayment: number;
            nextDueDate: string | null;
            overdueAmount: number;
          }[];
          totals: {
            monthlyPayment: number;
            overdue: number;
            remaining: number;
            interestLeft: number;
          };
        }>('/reports/loans')
      ).data,
  });

  const o = overview.data;
  const expensePie = (byCategory.data ?? []).filter((c) => c.kind === 'expense');
  const projectRows = (byProject.data ?? []).filter((p) => p.projectId !== null);

  return (
    <>
      <FilterBar
        fields={fields}
        values={values}
        onChange={set}
        onReset={reset}
        activeCount={activeCount}
      />

      {/* Khối 1 — tiền thật. Gồm cả vay và trả nợ, nên khớp tiền trong túi. */}
      <Section title="Tiền mặt" hint="gồm cả tiền vay và tiền trả nợ">
        <Stat
          label="Số dư hiện tại"
          value={o?.cash.balance}
          big
          icon={<Banknote size={15} />}
        />
        <Stat
          label="Vào (kỳ lọc)"
          value={o?.cash.income}
          tone="in"
          icon={<TrendingUp size={15} />}
        />
        <Stat
          label="Ra (kỳ lọc)"
          value={o?.cash.expense}
          tone="out"
          icon={<TrendingDown size={15} />}
        />
        <Stat
          label="Tài sản ròng"
          value={o?.netWorth}
          icon={<Scale size={15} />}
          hint="Số dư − nợ phải trả + nợ phải thu"
        />
      </Section>

      {/* Khối 2 — lãi lỗ. Bỏ vay/trả gốc vì không phải thu nhập/chi phí. */}
      <Section title="Lãi / lỗ" hint="không tính tiền vay và trả gốc">
        <Stat
          label="Lãi/lỗ công việc"
          value={o?.business.net}
          big
          icon={<PiggyBank size={15} />}
        />
        <Stat label="Doanh thu công việc" value={o?.business.income} tone="in" />
        <Stat label="Chi phí công việc" value={o?.business.expense} tone="out" />
        <Stat label="Chi tiêu cá nhân" value={o?.personal.expense} tone="out" />
      </Section>

      {/* Khối 3 — nợ. */}
      <Section title="Nợ">
        <Stat
          label="Tôi đang nợ"
          value={o?.debts.iOwe}
          tone="out"
          icon={<HandCoins size={15} />}
        />
        <Stat label="Đang nợ tôi" value={o?.debts.owesMe} tone="in" />
        <Stat label="Trong đó quá hạn" value={o?.debts.overdue} tone="out" />
        <Stat label="Lãi vay đã trả" value={o?.debts.interestPaid} tone="out" />
      </Section>

      {!!loans.data?.items.length && (
        <>
          <Section
            title="Khoản vay có lịch trả"
            hint="ngân hàng, công ty tài chính, thấu chi"
          >
            <Stat
              label="Phải trả kỳ tới"
              value={loans.data.totals.monthlyPayment}
              tone="out"
              big
              icon={<CalendarClock size={15} />}
            />
            <Stat
              label="Đang thiếu / quá hạn"
              value={loans.data.totals.overdue}
              tone="out"
            />
            <Stat label="Dư nợ gốc" value={loans.data.totals.remaining} tone="out" />
            <Stat
              label="Tổng lãi cả kỳ vay"
              value={loans.data.totals.interestLeft}
              tone="out"
            />
          </Section>

          <div className="mb-4">
            <Card title="Chi tiết khoản vay" flush>
              <div className="scroll-slim overflow-x-auto">
                <table className={tableCls}>
                  <thead className={theadCls}>
                    <tr>
                      <th className={thCls}>Bên cho vay</th>
                      <th className={`${thCls} ${colMd}`}>Hình thức</th>
                      <th className={`${thCls} ${colSm} text-right`}>Dư nợ</th>
                      <th className={`${thCls} text-right`}>Kỳ tới</th>
                      <th className={`${thCls} ${colSm}`}>Đến hạn</th>
                      <th className={`${thCls} text-right`}>Đang thiếu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.data.items.map((l) => (
                      <tr key={l.debtId} className={trCls}>
                        <td className={`${tdCls} font-medium`}>
                          <Link
                            className="hover:text-brand hover:underline"
                            to={`/debts?q=${encodeURIComponent(l.lender)}`}
                          >
                            {l.lender}
                          </Link>
                        </td>
                        <td className={`${tdCls} ${colMd} text-xs text-muted`}>
                          {LOAN_TYPE_LABEL[l.loanType]}
                          <span className="text-faint">
                            {' '}
                            · {METHOD_LABEL[l.interestMethod]}
                          </span>
                        </td>
                        <td className={`${tdCls} ${colSm} text-right`}>
                          <Money value={l.remaining} />
                        </td>
                        <td className={`${tdCls} text-right font-semibold`}>
                          <Money value={l.nextPayment} />
                        </td>
                        <td
                          className={`${tdCls} ${colSm} tnum whitespace-nowrap text-muted`}
                        >
                          {dayVN(l.nextDueDate)}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          {l.overdueAmount ? (
                            <Badge tone="out">
                              {l.overdueAmount.toLocaleString('vi-VN')}
                            </Badge>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Dòng tiền theo tháng">
          {!monthly.data?.length ? (
            <Empty>Chưa có dữ liệu.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly.data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e6e8ef"
                />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(v) => (v / 1_000_000).toFixed(0) + 'tr'}
                />
                <Tooltip formatter={(v: unknown) => money(Number(v)) + ' đ'} />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Vào"
                  fill="#0f9b78"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="expense"
                  name="Ra"
                  fill="#e0574f"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Chi phí theo danh mục">
          {!expensePie.length ? (
            <Empty>Chưa có dữ liệu.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expensePie}
                  dataKey="total"
                  nameKey="name"
                  outerRadius={100}
                  isAnimationActive={false}
                  label={(e: any) => e.name}
                >
                  {expensePie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => money(Number(v)) + ' đ'} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Lãi / lỗ theo công việc" flush>
          {!projectRows.length ? (
            <Empty>Chưa có dữ liệu.</Empty>
          ) : (
            <table className={tableCls}>
              <thead className={theadCls}>
                <tr>
                  <th className={thCls}>Công việc</th>
                  <th className={`${thCls} ${colSm} text-right`}>Thu</th>
                  <th className={`${thCls} ${colSm} text-right`}>Chi</th>
                  <th className={`${thCls} text-right`}>Lãi/Lỗ</th>
                </tr>
              </thead>
              <tbody>
                {[...projectRows]
                  .sort((a, b) => b.profit - a.profit)
                  .map((p) => (
                    <tr key={String(p.projectId)} className={trCls}>
                      <td className={`${tdCls} font-medium`}>
                        <Link
                          className="hover:text-brand hover:underline"
                          to={`/transactions?projectId=${p.projectId}`}
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className={`${tdCls} ${colSm} text-right`}>
                        <Money value={p.income} signed="in" />
                      </td>
                      <td className={`${tdCls} ${colSm} text-right`}>
                        <Money value={p.expense} signed="out" />
                      </td>
                      <td className={`${tdCls} text-right font-semibold`}>
                        <Money value={p.profit} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Theo người" flush hint="dư nợ + tiền đã thu/chi gắn người">
          {!byPerson.data?.length ? (
            <Empty>Chưa có ai dư nợ hay phát sinh thu chi.</Empty>
          ) : (
            <table className={tableCls}>
              <thead className={theadCls}>
                <tr>
                  <th className={thCls}>Người</th>
                  <th className={`${thCls} ${colSm} text-right`}>Tôi nợ</th>
                  <th className={`${thCls} ${colSm} text-right`}>Nợ tôi</th>
                  <th className={`${thCls} ${colSm} text-right`}>Đã thu</th>
                  <th className={`${thCls} text-right`}>Đã chi</th>
                </tr>
              </thead>
              <tbody>
                {byPerson.data.map((p) => (
                  <tr key={p.personId} className={trCls}>
                    <td className={`${tdCls} font-medium`}>
                      <Link
                        className="hover:text-brand hover:underline"
                        to={`/debts?personId=${p.personId}`}
                      >
                        {p.name}
                      </Link>
                      {/* Cột nợ ẩn trên điện thoại — nhắc lại ở đây. */}
                      {(p.iOwe > 0 || p.owesMe > 0) && (
                        <div className="text-[11px] text-faint sm:hidden">
                          {p.iOwe > 0 && `tôi nợ ${p.iOwe.toLocaleString('vi-VN')}`}
                          {p.iOwe > 0 && p.owesMe > 0 && ' · '}
                          {p.owesMe > 0 && `nợ tôi ${p.owesMe.toLocaleString('vi-VN')}`}
                        </div>
                      )}
                    </td>
                    <td className={`${tdCls} ${colSm} text-right`}>
                      {p.iOwe ? (
                        <Money value={p.iOwe} signed="out" />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className={`${tdCls} ${colSm} text-right`}>
                      {p.owesMe ? (
                        <Money value={p.owesMe} signed="in" />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className={`${tdCls} ${colSm} text-right`}>
                      {p.income ? (
                        <Money value={p.income} signed="in" />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className={`${tdCls} text-right font-semibold`}>
                      {p.expense ? (
                        <Money value={p.expense} signed="out" />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <SectionTitle hint={hint}>{title}</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}
