import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, errorMessage, type Page, type Person } from '../../lib/api';
import { queryString, useFilters } from '../../lib/useFilters';
import { FilterBar, type FilterField } from '../../components/FilterBar';
import {
  Button,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  Money,
  Pager,
  Skeleton,
  tableCls,
  tdCls,
  theadCls,
  thCls,
  trCls,
} from '../../components/ui';
import { Plus, UserRound } from 'lucide-react';

const DEFAULTS = { q: '', status: '', sort: 'name:asc', page: '1' };

const FIELDS: FilterField[] = [
  { key: 'q', label: 'Tên / điện thoại', type: 'text' },
  {
    key: 'status',
    label: 'Tình trạng',
    type: 'select',
    options: [
      { value: '', label: 'Tất cả' },
      { value: 'owing', label: 'Còn dư nợ' },
      { value: 'clear', label: 'Đã sạch nợ' },
    ],
  },
  {
    key: 'sort',
    label: 'Sắp xếp',
    type: 'select',
    options: [
      { value: 'name:asc', label: 'Tên A→Z' },
      { value: 'iOwe:desc', label: 'Tôi nợ nhiều nhất' },
      { value: 'owesMe:desc', label: 'Nợ tôi nhiều nhất' },
    ],
  },
];

export function PeoplePage() {
  const { values, set, reset, activeCount } = useFilters(DEFAULTS);
  const [editing, setEditing] = useState<Person | null | undefined>(undefined);
  const qc = useQueryClient();

  const qs = queryString(values);
  const list = useQuery({
    queryKey: ['people', qs],
    queryFn: async () => (await api.get<Page<Person>>(`/people?${qs}`)).data,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/people/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
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
          <Plus size={15} /> Thêm người
        </Button>
      </FilterBar>

      <Card title="Người" flush>
        {list.isLoading ? (
          <div className="p-4">
            <Skeleton />
          </div>
        ) : !data?.items.length ? (
          <Empty icon={<UserRound size={22} />}>
            Chưa có ai. Thêm người trước khi ghi khoản nợ.
          </Empty>
        ) : (
          <div className="scroll-slim overflow-x-auto">
            <table className={tableCls}>
              <thead className={theadCls}>
                <tr>
                  <th className={thCls}>Tên</th>
                  <th className={thCls}>Điện thoại</th>
                  <th className={`${thCls} text-right`}>Tôi đang nợ</th>
                  <th className={`${thCls} text-right`}>Đang nợ tôi</th>
                  <th className={`${thCls} text-right`}>Số khoản</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className={`${trCls} group`}>
                    <td className={tdCls}>
                      <Link
                        className="font-medium hover:text-brand hover:underline"
                        to={`/debts?personId=${p.id}`}
                      >
                        {p.name}
                      </Link>
                      {p.note && <div className="text-xs text-faint">{p.note}</div>}
                    </td>
                    <td className={`${tdCls} tnum text-muted`}>
                      {p.phone ?? <span className="text-faint">—</span>}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      {p.iOwe ? (
                        <Money value={p.iOwe} signed="out" />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      {p.owesMe ? (
                        <Money value={p.owesMe} signed="in" />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className={`${tdCls} tnum text-right text-muted`}>{p.debtCount}</td>
                    <td className={`${tdCls} text-right whitespace-nowrap`}>
                      <span className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => confirm(`Xoá ${p.name}?`) && remove.mutate(p.id)}
                        >
                          Xoá
                        </Button>
                      </span>
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
        <PersonForm
          value={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            qc.invalidateQueries({ queryKey: ['people'] });
          }}
        />
      )}
    </>
  );
}

function PersonForm({
  value,
  onClose,
  onSaved,
}: {
  value: Person | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: value?.name ?? '',
    phone: value?.phone ?? '',
    note: value?.note ?? '',
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        phone: form.phone || undefined,
        note: form.note || undefined,
      };
      return value ? api.patch(`/people/${value.id}`, body) : api.post('/people', body);
    },
    onSuccess: onSaved,
    onError: (e) => alert(errorMessage(e)),
  });

  return (
    <Modal open title={value ? 'Sửa người' : 'Thêm người'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Tên">
          <Input
            required
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Điện thoại">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
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
