import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, type Category, type Page } from '../../lib/api';
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
import { Plus, Tags } from 'lucide-react';

const DEFAULTS = { q: '', kind: '', sort: 'name:asc', page: '1' };

const FIELDS: FilterField[] = [
  { key: 'q', label: 'Tên', type: 'text' },
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
];

export function CategoriesPage() {
  const { values, set, reset, activeCount } = useFilters(DEFAULTS);
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const qc = useQueryClient();

  const qs = queryString(values);
  const list = useQuery({
    queryKey: ['categories', qs],
    queryFn: async () => (await api.get<Page<Category>>(`/categories?${qs}`)).data,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
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
          <Plus size={15} /> Thêm danh mục
        </Button>
      </FilterBar>

      <Card
        title="Danh mục"
        hint="Danh mục hệ thống dùng cho giao dịch sinh từ khoản nợ, không sửa/xoá được"
        flush
      >
        {list.isLoading ? (
          <div className="p-4">
            <Skeleton />
          </div>
        ) : !data?.items.length ? (
          <Empty icon={<Tags size={22} />}>Chưa có danh mục nào.</Empty>
        ) : (
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Tên</th>
                <th className={thCls}>Loại</th>
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className={`${trCls} group`}>
                  <td className={`${tdCls} font-medium`}>
                    {c.name}
                    {c.code && <Badge title="Danh mục hệ thống">hệ thống</Badge>}
                  </td>
                  <td className={tdCls}>
                    <Badge tone={c.kind === 'income' ? 'in' : 'out'}>
                      {c.kind === 'income' ? 'Tiền vào' : 'Tiền ra'}
                    </Badge>
                  </td>
                  <td className={`${tdCls} text-right`}>
                    {!c.code && (
                      <RowActions
                        onEdit={() => setEditing(c)}
                        onDelete={() =>
                          confirm('Xoá danh mục này?') && remove.mutate(c.id)
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <CategoryForm
          value={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            qc.invalidateQueries({ queryKey: ['categories'] });
          }}
        />
      )}
    </>
  );
}

function CategoryForm({
  value,
  onClose,
  onSaved,
}: {
  value: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: value?.name ?? '',
    kind: value?.kind ?? ('expense' as 'income' | 'expense'),
  });

  const save = useMutation({
    mutationFn: () =>
      value
        ? api.patch(`/categories/${value.id}`, form)
        : api.post('/categories', form),
    onSuccess: onSaved,
    onError: (e) => alert(errorMessage(e)),
  });

  return (
    <Modal open title={value ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={onClose}>
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
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Loại">
          <Select
            value={form.kind}
            onChange={(e) =>
              setForm({ ...form, kind: e.target.value as 'income' | 'expense' })
            }
          >
            <option value="expense">Tiền ra</option>
            <option value="income">Tiền vào</option>
          </Select>
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
