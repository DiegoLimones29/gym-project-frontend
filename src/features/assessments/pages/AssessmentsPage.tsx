import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { fetchMembersRequest, MemberProfileItem } from '../../profiles/api';
import {
  createAssessmentRequest,
  deleteAssessmentRequest,
  fetchAssessmentsRequest,
} from '../api';

const createAssessmentSchema = z.object({
  memberId: z.string().uuid('Busca y selecciona un socio'),
  assessmentDate: z.string().min(1, 'Fecha obligatoria'),
  weightKg: z
    .number({ message: 'Ingresa el peso' })
    .positive('El peso debe ser mayor a 0'),
  bodyFatPercentage: z
    .number({ message: 'Ingresa el % de grasa' })
    .positive('Debe ser mayor a 0')
    .max(80, 'Valor inválido'),
  notes: z.string().optional(),
});

type CreateAssessmentFormData = z.infer<typeof createAssessmentSchema>;

export function AssessmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role ?? 'member';
  const canManage = role === 'admin' || role === 'worker';

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  // Buscador de socio por correo
  const [emailQuery, setEmailQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberProfileItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: allAssessments = [], isLoading } = useQuery({
    queryKey: ['fitness-assessments'],
    queryFn: fetchAssessmentsRequest,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members-profile'],
    queryFn: fetchMembersRequest,
    enabled: canManage,
  });

  const visibleAssessments = useMemo(() => {
    if (canManage) return allAssessments;
    return allAssessments.filter((a) => a.memberId === user?.id);
  }, [allAssessments, canManage, user?.id]);

  const filteredMembers = useMemo(() => {
    const term = emailQuery.trim().toLowerCase();
    if (!term) return members.slice(0, 6);
    return members.filter((m) => {
      const email = m.user?.email?.toLowerCase() ?? '';
      const fullName = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.toLowerCase();
      return email.includes(term) || fullName.includes(term);
    });
  }, [members, emailQuery]);

  const todayStr = new Date().toISOString().split('T')[0];

  const form = useForm<CreateAssessmentFormData>({
    resolver: zodResolver(createAssessmentSchema),
    defaultValues: {
      memberId: '',
      assessmentDate: todayStr,
    },
  });

  const handleSelectMember = (member: MemberProfileItem) => {
    setSelectedMember(member);
    setEmailQuery(member.user?.email ?? '');
    setIsDropdownOpen(false);
    form.setValue('memberId', member.userId, { shouldValidate: true });
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setEmailQuery('');
    form.setValue('memberId', '', { shouldValidate: false });
  };

  const handleCreate = async (data: CreateAssessmentFormData) => {
    if (!user?.id) return;
    try {
      setFeedback(null);
      await createAssessmentRequest({
        memberId: data.memberId,
        workerId: user.id,
        assessmentDate: data.assessmentDate,
        weightKg: data.weightKg,
        bodyFatPercentage: data.bodyFatPercentage,
        ...(data.notes && { notes: data.notes }),
      });
      form.reset({ memberId: '', assessmentDate: todayStr, notes: '' });
      setSelectedMember(null);
      setEmailQuery('');
      await queryClient.invalidateQueries({ queryKey: ['fitness-assessments'] });
      setFeedback({ type: 'ok', text: 'Evaluación física registrada.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al registrar evaluación';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusyId(id);
      setFeedback(null);
      await deleteAssessmentRequest(id);
      await queryClient.invalidateQueries({ queryKey: ['fitness-assessments'] });
      setFeedback({ type: 'ok', text: 'Evaluación eliminada.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al eliminar';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Evaluaciones Físicas</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Control antropométrico, peso corporal y porcentaje de grasa
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border p-3.5 text-sm ${
            feedback.type === 'ok'
              ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-300'
              : 'bg-red-500/10 border-red-500/40 text-red-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Formulario para Admin y Worker */}
      {canManage && (
        <section className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-white mb-4">
            Registrar Nueva Evaluación
          </h2>

          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-neutral-200 mb-1">
                Buscar socio por correo
              </label>
              <input type="hidden" {...form.register('memberId')} />

              {selectedMember ? (
                <div className="flex items-center justify-between rounded-lg bg-neutral-950 border border-yellow-400/60 px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {selectedMember.user
                        ? `${selectedMember.user.firstName} ${selectedMember.user.lastName}`
                        : selectedMember.phone}
                    </p>
                    <p className="text-xs text-yellow-400">
                      {selectedMember.user?.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearMember}
                    className="rounded-md bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={emailQuery}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
                    onChange={(e) => {
                      setEmailQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    placeholder="correo@ejemplo.com..."
                    autoComplete="off"
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                  />

                  {isDropdownOpen && (
                    <div className="absolute z-20 mt-1.5 max-h-48 w-full overflow-y-auto rounded-xl bg-neutral-950 border border-neutral-800 shadow-2xl divide-y divide-neutral-900">
                      {filteredMembers.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-neutral-500">
                          Sin coincidencias
                        </div>
                      ) : (
                        filteredMembers.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onMouseDown={() => handleSelectMember(m)}
                            className="w-full px-4 py-2 text-left hover:bg-neutral-900 cursor-pointer"
                          >
                            <p className="truncate text-sm font-medium text-white">
                              {m.user?.email ?? m.phone}
                            </p>
                            {m.user && (
                              <p className="truncate text-xs text-neutral-400">
                                {m.user.firstName} {m.user.lastName}
                              </p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}

              {form.formState.errors.memberId && (
                <p className="mt-1 text-xs text-yellow-400">
                  {form.formState.errors.memberId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  {...form.register('assessmentDate')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="74.50"
                  {...form.register('weightKg', { valueAsNumber: true })}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {form.formState.errors.weightKg && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {form.formState.errors.weightKg.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  % Grasa corporal
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="18.50"
                  {...form.register('bodyFatPercentage', {
                    valueAsNumber: true,
                  })}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {form.formState.errors.bodyFatPercentage && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {form.formState.errors.bodyFatPercentage.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-200 mb-1">
                Observaciones / Recomendaciones (opcional)
              </label>
              <input
                type="text"
                placeholder="Buen progreso, aumentar ingesta proteica"
                {...form.register('notes')}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="rounded-lg bg-yellow-400 px-6 py-2.5 font-bold text-neutral-950 transition hover:bg-yellow-300 disabled:opacity-50 cursor-pointer"
            >
              {form.formState.isSubmitting
                ? 'Guardando...'
                : 'Guardar Evaluación'}
            </button>
          </form>
        </section>
      )}

      {/* Historial de evaluaciones */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">
          {canManage ? 'Historial de Evaluaciones' : 'Mi Historial de Progreso'}
        </h2>

        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              Cargando evaluaciones...
            </div>
          ) : visibleAssessments.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              No hay evaluaciones registradas todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-xs uppercase text-neutral-400">
                  <tr>
                    <th className="px-5 py-3.5">Fecha</th>
                    <th className="px-5 py-3.5">Socio</th>
                    <th className="px-5 py-3.5">Peso</th>
                    <th className="px-5 py-3.5">% Grasa</th>
                    <th className="px-5 py-3.5">Evaluador</th>
                    <th className="px-5 py-3.5">Notas</th>
                    {canManage && <th className="px-5 py-3.5 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {visibleAssessments.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-neutral-800/50 transition"
                    >
                      <td className="px-5 py-4 text-neutral-300">
                        {new Date(`${item.assessmentDate}T00:00:00`).toLocaleDateString(
                          'es-MX',
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-white">
                        {item.member
                          ? `${item.member.firstName} ${item.member.lastName}`
                          : item.memberId}
                      </td>
                      <td className="px-5 py-4 font-bold text-yellow-400">
                        {Number(item.weightKg).toFixed(2)} kg
                      </td>
                      <td className="px-5 py-4 text-neutral-200">
                        {Number(item.bodyFatPercentage).toFixed(2)}%
                      </td>
                      <td className="px-5 py-4 text-neutral-400">
                        {item.worker
                          ? `${item.worker.firstName} ${item.worker.lastName}`
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-neutral-400">
                        {item.notes || '—'}
                      </td>
                      {canManage && (
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleDelete(item.id)}
                            className="text-xs font-semibold text-red-400 hover:underline cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}