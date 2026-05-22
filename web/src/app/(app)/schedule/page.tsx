'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { scheduleApi } from '@/lib/api';
import { Button, Card, Toggle, Select, Input, Spinner, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';

const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const DAYS_FULL = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function SchedulePage() {
  const qc = useQueryClient();
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: scheduleApi.getAll,
  });

  const create = useMutation({
    mutationFn: scheduleApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof scheduleApi.update>[1] }) =>
      scheduleApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => scheduleApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });

  const [form, setForm] = useState({ day_of_week: 1, start_time: '09:00', end_time: '09:30' });

  const handleAdd = () => {
    create.mutate({ ...form, is_active: true });
  };

  return (
    <div>
      <PageHeader
        title="Çalışma Programı"
        subtitle="Hatırlatıcılar ve haftalık planlama"
      />

      {/* Add form */}
      <Card className="mb-6">
        <p className="text-sm font-semibold text-slate-700 mb-4">Yeni Program Ekle</p>
        <div className="flex flex-wrap gap-3 items-end">
          <Select
            label="Gün"
            value={form.day_of_week}
            onChange={(e) => setForm((p) => ({ ...p, day_of_week: Number(e.target.value) }))}
            options={DAYS_FULL.map((d, i) => ({ value: i, label: d }))}
            wrapperClassName="w-36"
          />
          <Input
            label="Başlangıç"
            type="time"
            value={form.start_time}
            onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
            wrapperClassName="w-32"
          />
          <Input
            label="Bitiş"
            type="time"
            value={form.end_time}
            onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
            wrapperClassName="w-32"
          />
          <Button onClick={handleAdd} icon={<Plus size={16} />} loading={create.isPending}>
            Ekle
          </Button>
        </div>
      </Card>

      {/* Weekly view */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {DAYS.map((day, i) => {
          const daySchedules = schedules?.filter((s) => s.day_of_week === i) ?? [];
          return (
            <div key={day} className="text-center">
              <p className="text-xs font-semibold text-slate-400 mb-2">{day}</p>
              <div
                className={`rounded-xl border-2 py-2 px-1 min-h-12 flex flex-col items-center justify-center gap-1 transition-colors ${
                  daySchedules.some((s) => s.is_active)
                    ? 'border-sky-200 bg-sky-50'
                    : 'border-slate-100 bg-white'
                }`}
              >
                {daySchedules.length === 0 ? (
                  <span className="text-slate-200 text-lg">·</span>
                ) : (
                  daySchedules.map((s) => (
                    <span key={s.id} className="text-xs text-sky-600 font-medium">
                      {s.start_time.slice(0, 5)}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !schedules?.length ? (
        <EmptyState
          icon={<Calendar size={28} />}
          title="Henüz program yok"
          description="Düzenli çalışma için program ekle."
        />
      ) : (
        <Card padding="none">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0">
                {DAYS[s.day_of_week]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{DAYS_FULL[s.day_of_week]}</p>
                <p className="text-xs text-slate-400">{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</p>
              </div>
              <Toggle
                checked={s.is_active}
                onChange={(v) => update.mutate({ id: s.id, data: { is_active: v } })}
              />
              <button
                onClick={() => remove.mutate(s.id)}
                className="p-2 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
