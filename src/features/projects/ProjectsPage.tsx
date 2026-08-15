import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, errorMessage, type Page, type Project } from '../../lib/api';
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
  RowActions,
  Skeleton,
  tableCls,
  colMd,
  colSm,
  tdCls,
  theadCls,
  thCls,
  trCls,
} from '../../components/ui';
import { Briefcase, Plus } from 'lucide-react';
import { dayVN, today } from '../../lib/format';

const DEFAULTS = {
  q: '',
  status: '',
  from: '',
  to: '',
  sort: 'profit:desc',
  page: '1',
};

const FIELDS: FilterField[] = [
  { key: 'q', label: 'Tên / ghi chú', type: 'text' },
  {
    key: 'status',
    label: 'Trạng thái',
    type: 'select',
    options: [
      { value: '', label: 'Tất cả' },
      { value: 'open', label: 'Đang làm' },
      { value: 'closed', label: 'Đã đóng' },
    ],
  },
  {
    key: 'sort',
    label: 'Sắp xếp',
    type: 'select',
    options: [
      { value: 'profit:desc', label: 'Lãi cao nhất' },
      { value: 'profit:asc', label: 'Lỗ nhiều nhất' },
      { value: 'income:desc', label: 'Thu nhiều nhất' },
      { value: 'expense:desc', label: 'Chi nhiều nhất' },
      { value: 'name:asc', label: 'Tên A→Z' },
    ],
  },
  { key: 'from', label: 'Tính từ ngày', type: 'date' },
  { key: 'to', label: 'Tính đến ngày', type: 'date' },
];

export function ProjectsPage() {
  const { values, set, reset, activeCount } = useFilters(DEFAULTS);
  const [editing, setEditing] = useState<Project | null | undefined>(undefined);
  const qc = useQueryClient();

  const qs = queryString(values);
  const list = useQuery({
    queryKey: ['projects', qs],
    queryFn: async () => (await api.get<Page<Project>>(`/projects?${qs}`)).data,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    onError: (e) => alert(errorMessage(e)),
  });

  // Đóng = ghi ngày đóng, mở lại = xoá ngày đóng. Không có cột trạng thái riêng.
  const setClosed = useMutation({
    mutationFn: ({ id, closedAt }: { id: number; closedAt: string | null }) =>
      api.patch(`/projects/${id}`, { closedAt }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    onError: (e) => alert(errorMessage(e)),
  });

  const data = list.data;

  return (
    <>
      <FilterBar
        fields={FIELDS}
        values={values}
        onChange={set}
        onReset={reset}
        activeCount={activeCount}
      >
        <Button variant="primary" onClick={() => setEditing(null)}>
          <Plus size={15} /> Thêm công việc
        </Button>
      </FilterBar>

      <Card title="Công việc" flush>
        {list.isLoading ? (
          <div className="p-4">
            <Skeleton />
          </div>
        ) : !data?.items.length ? (
          <Empty icon={<Briefcase size={22} />}>Chưa có công việc nào.</Empty>
        ) : (
          <div className="scroll-slim overflow-x-auto">
            <table className={tableCls}>
              <thead className={theadCls}>
                <tr>
                  <th className={thCls}>Tên</th>
                  <th className={`${thCls} ${colMd}`}>Bắt đầu</th>
                  <th className={`${thCls} ${colSm}`}>Trạng thái</th>
                  <th className={`${thCls} ${colSm} text-right`}>Thu</th>
                  <th className={`${thCls} ${colSm} text-right`}>Chi</th>
                  <th className={`${thCls} text-right`}>Lãi/Lỗ</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className={`${trCls} group`}>
                    {/* max-w để tên dài không đẩy bảng rộng quá màn hình điện thoại. */}
                    <td className={`${tdCls} max-w-[38vw] md:max-w-none`}>
                      <Link
                        className="block truncate font-medium hover:text-brand hover:underline md:overflow-visible"
                        to={`/transactions?projectId=${p.id}`}
                      >
                        {p.name}
                      </Link>
                      {p.note && (
                        <div className="truncate text-xs text-faint">{p.note}</div>
                      )}
                      {/* Cột Trạng thái ẩn trên điện thoại — nhắc lại ở đây. */}
                      <div className="text-[11px] text-faint sm:hidden">
                        {p.closedAt ? `Đã đóng ${dayVN(p.closedAt)}` : 'Đang làm'}
                      </div>
                    </td>
                    <td
                      className={`${tdCls} ${colMd} tnum whitespace-nowrap text-muted`}
                    >
                      {dayVN(p.startedAt)}
                    </td>
                    <td className={`${tdCls} ${colSm} whitespace-nowrap`}>
                      {/* Bấm thẳng vào badge để đóng / mở lại, khỏi vào form Sửa. */}
                      <button
                        type="button"
                        title={
                          p.closedAt
                            ? `Đóng ngày ${dayVN(p.closedAt)} — bấm để mở lại`
                            : 'Bấm để kết thúc công việc'
                        }
                        disabled={setClosed.isPending}
                        onClick={() => {
                          if (p.closedAt) return setClosed.mutate({ id: p.id, closedAt: null });
                          if (confirm(`Kết thúc "${p.name}" hôm nay?`))
                            setClosed.mutate({ id: p.id, closedAt: today() });
                        }}
                      >
                        {p.closedAt ? (
                          <Badge>Đã đóng {dayVN(p.closedAt)}</Badge>
                        ) : (
                          <Badge tone="in">Đang làm</Badge>
                        )}
                      </button>
                    </td>
                    <td className={`${tdCls} ${colSm} text-right`}>
                      <Money value={p.income ?? 0} signed="in" />
                    </td>
                    <td className={`${tdCls} ${colSm} text-right`}>
                      <Money value={p.expense ?? 0} signed="out" />
                    </td>
                    <td className={`${tdCls} text-right font-semibold`}>
                      <Money value={p.profit ?? 0} />
                    </td>
                    <td className={`${tdCls} text-right whitespace-nowrap`}>
                      <RowActions
                        onEdit={() => setEditing(p)}
                        onDelete={() =>
                          confirm('Xoá công việc này?') && remove.mutate(p.id)
                        }
                      />
                    </td>
                  </tr>
                ))}
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
        <ProjectForm
          value={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            qc.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}
    </>
  );
}

function ProjectForm({
  value,
  onClose,
  onSaved,
}: {
  value: Project | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: value?.name ?? '',
    startedAt: value ? value.startedAt.slice(0, 10) : today(),
    closedAt: value?.closedAt ? value.closedAt.slice(0, 10) : '',
    note: value?.note ?? '',
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        startedAt: form.startedAt,
        closedAt: form.closedAt || null,
        note: form.note || undefined,
      };
      return value
        ? api.patch(`/projects/${value.id}`, body)
        : api.post('/projects', body);
    },
    onSuccess: onSaved,
    onError: (e) => alert(errorMessage(e)),
  });

  return (
    <Modal open title={value ? 'Sửa công việc' : 'Thêm công việc'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Tên công việc">
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bắt đầu">
            <Input
              type="date"
              required
              value={form.startedAt}
              onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
            />
          </Field>
          <Field label="Ngày đóng (bỏ trống = đang làm)">
            <Input
              type="date"
              value={form.closedAt}
              onChange={(e) => setForm({ ...form, closedAt: e.target.value })}
            />
          </Field>
        </div>
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
