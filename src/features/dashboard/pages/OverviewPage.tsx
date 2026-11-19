import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { fetchMembersRequest, fetchWorkersRequest } from '../../profiles/api';
import { fetchPlansRequest, fetchSubscriptionsRequest } from '../../plans/api';
import { fetchClassSchedulesRequest } from '../../classes/api';
import { fetchWorkoutPlansRequest } from '../../workouts/api';

export function OverviewPage() {
  const { user } = useAuth();
  const isAdmin = user?.roleId === 7 || user?.role === 'admin';

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['members-profile'],
    queryFn: fetchMembersRequest,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['worker-profile'],
    queryFn: fetchWorkersRequest,
    enabled: isAdmin,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: fetchPlansRequest,
  });

  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptionsRequest,
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['class-schedules'],
    queryFn: fetchClassSchedulesRequest,
  });

  const { data: workoutPlans = [] } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: fetchWorkoutPlansRequest,
  });

  const metrics = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activeSubs = subscriptions.filter(
      (s) => s.status === 'active' && new Date(s.endDate) >= now,
    );

    const expiringSoon = activeSubs.filter(
      (s) => new Date(s.endDate) <= sevenDaysFromNow,
    );

    const activeRevenue = activeSubs.reduce((sum, sub) => {
      const price = Number(
        sub.membershipPlan?.price ??
          plans.find((p) => p.id === sub.planId)?.price ??
          0,
      );
      return sum + price;
    }, 0);

    const upcomingClasses = schedules.filter(
      (s) => s.status === 'scheduled' && new Date(s.startTime) >= now,
    );

    const activeWorkouts = workoutPlans.filter((w) => w.isActive);

    return {
      totalMembers: members.length,
      totalWorkers: workers.length,
      activeSubsCount: activeSubs.length,
      expiringSoon,
      activeRevenue,
      upcomingClasses,
      activeWorkoutsCount: activeWorkouts.length,
    };
  }, [members, workers, subscriptions, plans, schedules, workoutPlans]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Resumen del Gimnasio</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Sesión activa: <span className="text-yellow-400">{user?.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/register"
            className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-neutral-950 transition hover:bg-yellow-300"
          >
            + Registrar Socio
          </Link>
          <Link
            to="/dashboard/plans"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-yellow-400/50"
          >
            Asignar Plan
          </Link>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Socios Registrados
          </p>
          <p className="mt-2 text-3xl font-extrabold text-white">
            {loadingMembers ? '—' : metrics.totalMembers}
          </p>
          <Link
            to="/dashboard/members"
            className="mt-2 inline-block text-xs font-medium text-yellow-400 hover:underline"
          >
            Ver directorio →
          </Link>
        </div>

        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Suscripciones Activas
          </p>
          <p className="mt-2 text-3xl font-extrabold text-yellow-400">
            {loadingSubs ? '—' : metrics.activeSubsCount}
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            {metrics.expiringSoon.length} por vencer en 7 días
          </p>
        </div>

        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Ingresos Activos
          </p>
          <p className="mt-2 text-3xl font-extrabold text-white">
            ${metrics.activeRevenue.toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-neutral-500">MXN en membresías vigentes</p>
        </div>

        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {isAdmin ? 'Personal / Trabajadores' : 'Rutinas Activas'}
          </p>
          <p className="mt-2 text-3xl font-extrabold text-white">
            {isAdmin ? metrics.totalWorkers : metrics.activeWorkoutsCount}
          </p>
          <Link
            to={isAdmin ? '/dashboard/workers' : '/dashboard/workouts'}
            className="mt-2 inline-block text-xs font-medium text-yellow-400 hover:underline"
          >
            {isAdmin ? 'Gestionar equipo →' : 'Ver rutinas →'}
          </Link>
        </div>
      </div>

      {/* Próximas clases y membresías por vencer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Próximas Clases Programadas
            </h2>
            <Link
              to="/dashboard/classes"
              className="text-xs font-semibold text-yellow-400 hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {loadingSchedules ? (
            <p className="text-sm text-neutral-400">Cargando horarios...</p>
          ) : metrics.upcomingClasses.length === 0 ? (
            <p className="text-sm text-neutral-400">
              No hay clases próximas programadas.
            </p>
          ) : (
            <div className="divide-y divide-neutral-800">
              {metrics.upcomingClasses.slice(0, 5).map((sch) => {
                const booked = (sch.classBookings ?? []).filter(
                  (b) => b.bookingStatus === 'confirmed',
                ).length;
                const cap = sch.fitnessClass?.capacity ?? 0;

                return (
                  <div
                    key={sch.id}
                    className="py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {sch.fitnessClass?.name ?? 'Clase'}{' '}
                        <span className="text-xs font-normal text-neutral-400">
                          · {sch.roomName}
                        </span>
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Coach:{' '}
                        {sch.trainer
                          ? `${sch.trainer.firstName} ${sch.trainer.lastName}`
                          : 'Por asignar'}{' '}
                        ·{' '}
                        {new Date(sch.startTime).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-md bg-yellow-400/10 border border-yellow-400/30 px-2.5 py-1 text-xs font-semibold text-yellow-400">
                      {booked} / {cap}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Membresías por Vencer (7 días)
            </h2>
            <Link
              to="/dashboard/plans"
              className="text-xs font-semibold text-yellow-400 hover:underline"
            >
              Ir a planes
            </Link>
          </div>

          {loadingSubs ? (
            <p className="text-sm text-neutral-400">Revisando vigencias...</p>
          ) : metrics.expiringSoon.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Ninguna suscripción vence en los próximos 7 días.
            </p>
          ) : (
            <div className="divide-y divide-neutral-800">
              {metrics.expiringSoon.slice(0, 5).map((sub) => (
                <div
                  key={sub.id}
                  className="py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {sub.user
                        ? `${sub.user.firstName} ${sub.user.lastName}`
                        : sub.memberId}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {sub.membershipPlan?.name ?? `Plan #${sub.planId}`}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-md bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-400">
                    Vence{' '}
                    {new Date(sub.endDate).toLocaleDateString('es-MX', {
                      timeZone: 'UTC',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}