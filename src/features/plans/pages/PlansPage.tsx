import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { fetchMembersRequest, MemberProfileItem } from '../../profiles/api';
import {
  cancelSubscriptionRequest,
  createPlanRequest,
  createSubscriptionRequest,
  deleteSubscriptionRequest,
  fetchPlansRequest,
  fetchSubscriptionsRequest,
} from '../api';

const createPlanSchema = z.object({
  name: z.string().min(2, 'Nombre obligatorio'),
  description: z.string().min(4, 'Descripción obligatoria'),
  price: z.number({ message: 'Ingresa un precio' }).positive('Debe ser mayor a 0'),
  durationDays: z
    .number({ message: 'Ingresa los días' })
    .int('Debe ser entero')
    .positive('Mínimo 1 día'),
});

type CreatePlanFormData = z.infer<typeof createPlanSchema>;

const assignSubSchema = z.object({
  memberId: z.string().uuid('Busca y selecciona un miembro válido'),
  planId: z.number({ message: 'Selecciona un plan' }).min(1, 'Selecciona un plan'),
  startDate: z.string().optional(),
});

type AssignSubFormData = z.infer<typeof assignSubSchema>;

export function PlansPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role ?? 'member';
  const isAdmin = role === 'admin';
  const canManageSubs = role === 'admin' || role === 'worker';

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [busySubId, setBusySubId] = useState<string | null>(null);

  // Estado del buscador de miembros por correo
  const [emailQuery, setEmailQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberProfileItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: fetchPlansRequest,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members-profile'],
    queryFn: fetchMembersRequest,
    enabled: canManageSubs,
  });

  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptionsRequest,
    enabled: canManageSubs,
  });

  const activeMemberIds = useMemo(
    () =>
      new Set(
        subscriptions
          .filter((sub) => sub.status === 'active')
          .map((sub) => sub.memberId),
      ),
    [subscriptions],
  );

  // Filtrado por correo (y coincidencia secundaria por nombre)
  const filteredMembers = useMemo(() => {
    const term = emailQuery.trim().toLowerCase();
    if (!term) return members.slice(0, 6);
    return members.filter((m) => {
      const email = m.user?.email?.toLowerCase() ?? '';
      const fullName = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.toLowerCase();
      return email.includes(term) || fullName.includes(term);
    });
  }, [members, emailQuery]);

  const planForm = useForm<CreatePlanFormData>({
    resolver: zodResolver(createPlanSchema),
  });

  const subForm = useForm<AssignSubFormData>({
    resolver: zodResolver(assignSubSchema),
    defaultValues: {
      memberId: '',
    },
  });

  const handleSelectMember = (member: MemberProfileItem) => {
    if (activeMemberIds.has(member.userId)) return;
    setSelectedMember(member);
    setEmailQuery(member.user?.email ?? '');
    setIsDropdownOpen(false);
    subForm.setValue('memberId', member.userId, { shouldValidate: true });
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setEmailQuery('');
    subForm.setValue('memberId', '', { shouldValidate: false });
  };

  const handleCreatePlan = async (data: CreatePlanFormData) => {
    try {
      setFeedback(null);
      await createPlanRequest(data);
      planForm.reset();
      await queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      setFeedback({ type: 'ok', text: 'Plan de membresía creado correctamente.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al crear el plan';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    }
  };

  const handleAssignSub = async (data: AssignSubFormData) => {
    try {
      setFeedback(null);
      await createSubscriptionRequest({
        memberId: data.memberId,
        planId: data.planId,
        ...(data.startDate && { startDate: data.startDate }),
      });
      subForm.reset({ memberId: '', startDate: '' });
      setSelectedMember(null);
      setEmailQuery('');
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setFeedback({ type: 'ok', text: 'Suscripción asignada al miembro.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al asignar suscripción';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    }
  };

  const handleCancelSub = async (id: string) => {
    try {
      setBusySubId(id);
      setFeedback(null);
      await cancelSubscriptionRequest(id);
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setFeedback({
        type: 'ok',
        text: 'Suscripción cancelada. Ya puedes asignar un nuevo plan al miembro.',
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al cancelar la suscripción';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setBusySubId(null);
    }
  };

  const handleDeleteSub = async (id: string) => {
    try {
      setBusySubId(id);
      setFeedback(null);
      await deleteSubscriptionRequest(id);
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setFeedback({ type: 'ok', text: 'Registro de suscripción eliminado.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al eliminar la suscripción';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setBusySubId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Planes y Suscripciones</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Catálogo de membresías y control de vigencia de socios
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

      {/* Tarjetas de planes */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">
          Planes Disponibles
        </h2>

        {loadingPlans ? (
          <p className="text-sm text-neutral-400">Cargando planes...</p>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-sm text-neutral-400">
            Aún no hay planes registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col justify-between hover:border-yellow-400/50 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <span className="rounded bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 text-xs font-semibold text-yellow-400">
                      {plan.durationDays} días
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-400">{plan.description}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-neutral-800 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-yellow-400">
                    ${Number(plan.price).toFixed(2)}
                  </span>
                  <span className="text-xs text-neutral-500">MXN</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Formularios de gestión */}
      {canManageSubs && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asignar suscripción (Admin y Worker) */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Asignar Suscripción a Miembro
            </h2>

            <form
              onSubmit={subForm.handleSubmit(handleAssignSub)}
              className="space-y-4"
            >
              {/* Buscador por correo */}
              <div className="relative">
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Buscar socio por correo
                </label>

                <input type="hidden" {...subForm.register('memberId')} />

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
                      className="rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
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
                      placeholder="Escribe el correo (ej. membrillo@gmail.com)..."
                      autoComplete="off"
                      className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                    />

                    {isDropdownOpen && (
                      <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl bg-neutral-950 border border-neutral-800 shadow-2xl divide-y divide-neutral-900">
                        {filteredMembers.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-neutral-500">
                            No se encontraron socios con "{emailQuery}"
                          </div>
                        ) : (
                          filteredMembers.map((m) => {
                            const hasActiveSub = activeMemberIds.has(m.userId);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                disabled={hasActiveSub}
                                onMouseDown={() => handleSelectMember(m)}
                                className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-2 transition ${
                                  hasActiveSub
                                    ? 'opacity-50 cursor-not-allowed bg-neutral-950'
                                    : 'hover:bg-neutral-900 cursor-pointer'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-white">
                                    {m.user?.email ?? m.phone}
                                  </p>
                                  {m.user && (
                                    <p className="truncate text-xs text-neutral-400">
                                      {m.user.firstName} {m.user.lastName}
                                    </p>
                                  )}
                                </div>

                                {hasActiveSub && (
                                  <span className="shrink-0 rounded bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                                    Plan activo
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </>
                )}

                {subForm.formState.errors.memberId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {subForm.formState.errors.memberId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Plan
                </label>
                <select
                  {...subForm.register('planId', { valueAsNumber: true })}
                  defaultValue=""
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecciona un plan
                  </option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${Number(p.price).toFixed(2)} ({p.durationDays} días)
                    </option>
                  ))}
                </select>
                {subForm.formState.errors.planId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {subForm.formState.errors.planId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Fecha de inicio (opcional, hoy por defecto)
                </label>
                <input
                  type="date"
                  {...subForm.register('startDate')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={subForm.formState.isSubmitting}
                className="w-full rounded-lg bg-yellow-400 py-2.5 font-bold text-neutral-950 transition hover:bg-yellow-300 disabled:opacity-50 cursor-pointer"
              >
                {subForm.formState.isSubmitting
                  ? 'Asignando...'
                  : 'Activar Suscripción'}
              </button>
            </form>
          </div>

          {/* Crear nuevo plan (Solo Admin) */}
          {isAdmin && (
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
              <h2 className="text-lg font-bold text-white mb-4">
                Crear Nuevo Plan
              </h2>

              <form
                onSubmit={planForm.handleSubmit(handleCreatePlan)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-200 mb-1">
                    Nombre del plan
                  </label>
                  <input
                    type="text"
                    placeholder="Mensualidad General"
                    {...planForm.register('name')}
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                  />
                  {planForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-yellow-400">
                      {planForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-200 mb-1">
                      Precio (MXN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="550.00"
                      {...planForm.register('price', { valueAsNumber: true })}
                      className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                    />
                    {planForm.formState.errors.price && (
                      <p className="mt-1 text-xs text-yellow-400">
                        {planForm.formState.errors.price.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-200 mb-1">
                      Duración (días)
                    </label>
                    <input
                      type="number"
                      placeholder="30"
                      {...planForm.register('durationDays', {
                        valueAsNumber: true,
                      })}
                      className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                    />
                    {planForm.formState.errors.durationDays && (
                      <p className="mt-1 text-xs text-yellow-400">
                        {planForm.formState.errors.durationDays.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-200 mb-1">
                    Descripción / Beneficios
                  </label>
                  <input
                    type="text"
                    placeholder="Acceso ilimitado a área de pesas y cardio"
                    {...planForm.register('description')}
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                  />
                  {planForm.formState.errors.description && (
                    <p className="mt-1 text-xs text-yellow-400">
                      {planForm.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={planForm.formState.isSubmitting}
                  className="w-full rounded-lg bg-white py-2.5 font-bold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-50 cursor-pointer"
                >
                  {planForm.formState.isSubmitting ? 'Guardando...' : 'Guardar Plan'}
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {/* Tabla de suscripciones */}
      {canManageSubs && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            Suscripciones Registradas
          </h2>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
            {loadingSubs ? (
              <div className="p-8 text-center text-sm text-neutral-400">
                Cargando suscripciones...
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-400">
                Aún no hay suscripciones asignadas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-950 border-b border-neutral-800 text-xs uppercase text-neutral-400">
                    <tr>
                      <th className="px-5 py-3.5">Miembro</th>
                      <th className="px-5 py-3.5">Plan</th>
                      <th className="px-5 py-3.5">Inicio</th>
                      <th className="px-5 py-3.5">Vencimiento</th>
                      <th className="px-5 py-3.5">Estado</th>
                      <th className="px-5 py-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {subscriptions.map((sub) => {
                      const isExpired = new Date(sub.endDate) < new Date();
                      const isActive = sub.status === 'active' && !isExpired;
                      const isBusy = busySubId === sub.id;

                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-neutral-800/50 transition"
                        >
                          <td className="px-5 py-4 font-medium text-white">
                            {sub.user
                              ? `${sub.user.firstName} ${sub.user.lastName}`
                              : sub.memberId}
                          </td>
                          <td className="px-5 py-4 text-neutral-300">
                            {sub.membershipPlan?.name ?? `Plan #${sub.planId}`}
                          </td>
                          <td className="px-5 py-4 text-neutral-400">
                            {new Date(sub.startDate).toLocaleDateString('es-MX', {
                              timeZone: 'UTC',
                            })}
                          </td>
                          <td className="px-5 py-4 text-neutral-300">
                            {new Date(sub.endDate).toLocaleDateString('es-MX', {
                              timeZone: 'UTC',
                            })}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase ${
                                isActive
                                  ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
                                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
                              }`}
                            >
                              {isExpired && sub.status === 'active'
                                ? 'vencida'
                                : sub.status === 'cancelled'
                                  ? 'cancelada'
                                  : sub.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            {sub.status === 'active' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleCancelSub(sub.id)}
                                className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-400/20 disabled:opacity-50 cursor-pointer"
                              >
                                {isBusy ? 'Procesando...' : 'Cancelar'}
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteSub(sub.id)}
                                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 cursor-pointer"
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}