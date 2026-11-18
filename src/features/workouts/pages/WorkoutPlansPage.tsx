import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchMembersRequest,
  fetchWorkersRequest,
  MemberProfileItem,
} from '../../profiles/api';
import {
  createExerciseCatalogRequest,
  createRoutineExerciseRequest,
  createWorkoutPlanRequest,
  deleteRoutineExerciseRequest,
  fetchExerciseCatalogRequest,
  fetchWorkoutPlansRequest,
  toggleWorkoutPlanStatusRequest,
} from '../api';

const createExerciseSchema = z.object({
  name: z.string().min(2, 'Nombre obligatorio'),
  targetMuscleGroup: z.string().min(2, 'Grupo muscular obligatorio'),
  equipmentNeeded: z.string().optional(),
  videoUrl: z.string().optional(),
});

type CreateExerciseFormData = z.infer<typeof createExerciseSchema>;

const createPlanSchema = z.object({
  memberId: z.string().uuid('Busca y selecciona un socio'),
  trainerId: z.string().uuid('Selecciona un entrenador'),
  title: z.string().min(2, 'Título obligatorio'),
  goal: z.string().min(3, 'Objetivo obligatorio'),
});

type CreatePlanFormData = z.infer<typeof createPlanSchema>;

const addRoutineExerciseSchema = z.object({
  workoutPlanId: z.string().uuid('Selecciona una rutina'),
  exerciseId: z.string().uuid('Selecciona un ejercicio'),
  targetSets: z
    .number({ message: 'Ingresa las series' })
    .int()
    .positive('Mínimo 1 serie'),
  targetReps: z
    .number({ message: 'Ingresa las repeticiones' })
    .int()
    .positive('Mínimo 1 repetición'),
  orderIndex: z
    .number({ message: 'Ingresa el orden' })
    .int()
    .min(1, 'Mínimo orden 1'),
  notes: z.string().optional(),
});

type AddRoutineExerciseFormData = z.infer<typeof addRoutineExerciseSchema>;

export function WorkoutPlansPage() {
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

  const { data: allPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: fetchWorkoutPlansRequest,
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercise-catalog'],
    queryFn: fetchExerciseCatalogRequest,
    enabled: canManage,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members-profile'],
    queryFn: fetchMembersRequest,
    enabled: canManage,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['worker-profile'],
    queryFn: fetchWorkersRequest,
    enabled: canManage,
  });

  // Si es member, filtrar solo sus rutinas asignadas
  const visiblePlans = useMemo(() => {
    if (canManage) return allPlans;
    return allPlans.filter((p) => p.memberId === user?.id);
  }, [allPlans, canManage, user?.id]);

  const filteredMembers = useMemo(() => {
    const term = emailQuery.trim().toLowerCase();
    if (!term) return members.slice(0, 6);
    return members.filter((m) => {
      const email = m.user?.email?.toLowerCase() ?? '';
      const fullName = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.toLowerCase();
      return email.includes(term) || fullName.includes(term);
    });
  }, [members, emailQuery]);

  const exerciseForm = useForm<CreateExerciseFormData>({
    resolver: zodResolver(createExerciseSchema),
  });

  const planForm = useForm<CreatePlanFormData>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: { memberId: '', trainerId: '' },
  });

  const routineExerciseForm = useForm<AddRoutineExerciseFormData>({
    resolver: zodResolver(addRoutineExerciseSchema),
    defaultValues: {
      targetSets: 4,
      targetReps: 12,
      orderIndex: 1,
    },
  });

  const handleSelectMember = (member: MemberProfileItem) => {
    setSelectedMember(member);
    setEmailQuery(member.user?.email ?? '');
    setIsDropdownOpen(false);
    planForm.setValue('memberId', member.userId, { shouldValidate: true });
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setEmailQuery('');
    planForm.setValue('memberId', '', { shouldValidate: false });
  };

  const handleCreateExercise = async (data: CreateExerciseFormData) => {
    try {
      setFeedback(null);
      await createExerciseCatalogRequest({
        name: data.name,
        targetMuscleGroup: data.targetMuscleGroup,
        ...(data.equipmentNeeded && { equipmentNeeded: data.equipmentNeeded }),
        ...(data.videoUrl && { videoUrl: data.videoUrl }),
      });
      exerciseForm.reset();
      await queryClient.invalidateQueries({ queryKey: ['exercise-catalog'] });
      setFeedback({ type: 'ok', text: 'Ejercicio agregado al catálogo.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al guardar el ejercicio';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    }
  };

  const handleCreatePlan = async (data: CreatePlanFormData) => {
    try {
      setFeedback(null);
      await createWorkoutPlanRequest(data);
      planForm.reset({ memberId: '', trainerId: '', title: '', goal: '' });
      setSelectedMember(null);
      setEmailQuery('');
      await queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      setFeedback({ type: 'ok', text: 'Rutina creada y asignada al socio.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al crear la rutina';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    }
  };

  const handleAddRoutineExercise = async (data: AddRoutineExerciseFormData) => {
    try {
      setFeedback(null);
      await createRoutineExerciseRequest({
        workoutPlanId: data.workoutPlanId,
        exerciseId: data.exerciseId,
        targetSets: data.targetSets,
        targetReps: data.targetReps,
        orderIndex: data.orderIndex,
        ...(data.notes && { notes: data.notes }),
      });
      routineExerciseForm.reset({
        workoutPlanId: data.workoutPlanId,
        exerciseId: '',
        targetSets: 4,
        targetReps: 12,
        orderIndex: data.orderIndex + 1,
        notes: '',
      });
      await queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      setFeedback({ type: 'ok', text: 'Ejercicio añadido a la rutina.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al añadir ejercicio';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    }
  };

  const handleTogglePlanStatus = async (id: string, current: boolean) => {
    try {
      setBusyId(id);
      setFeedback(null);
      await toggleWorkoutPlanStatusRequest(id, !current);
      await queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al cambiar estado';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRoutineExercise = async (id: string) => {
    try {
      setBusyId(id);
      setFeedback(null);
      await deleteRoutineExerciseRequest(id);
      await queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al quitar ejercicio';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Rutinas y Ejercicios</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Planes de entrenamiento personalizados y catálogo de ejercicios
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

      {/* Formularios de gestión para Admin y Worker */}
      {canManage && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* 1. Crear rutina para socio */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Asignar Nueva Rutina
            </h2>

            <form
              onSubmit={planForm.handleSubmit(handleCreatePlan)}
              className="space-y-4"
            >
              <div className="relative">
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Buscar socio por correo
                </label>
                <input type="hidden" {...planForm.register('memberId')} />

                {selectedMember ? (
                  <div className="flex items-center justify-between rounded-lg bg-neutral-950 border border-yellow-400/60 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {selectedMember.user
                          ? `${selectedMember.user.firstName} ${selectedMember.user.lastName}`
                          : selectedMember.phone}
                      </p>
                      <p className="truncate text-xs text-yellow-400">
                        {selectedMember.user?.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearMember}
                      className="shrink-0 rounded-md bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700 cursor-pointer"
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

                {planForm.formState.errors.memberId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {planForm.formState.errors.memberId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Entrenador responsable
                </label>
                <select
                  {...planForm.register('trainerId')}
                  defaultValue=""
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecciona un entrenador
                  </option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.userId}>
                      {w.user
                        ? `${w.user.firstName} ${w.user.lastName} (${w.area})`
                        : w.area}
                    </option>
                  ))}
                </select>
                {planForm.formState.errors.trainerId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {planForm.formState.errors.trainerId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Título de la rutina
                </label>
                <input
                  type="text"
                  placeholder="Hipertrofia Tren Superior"
                  {...planForm.register('title')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {planForm.formState.errors.title && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {planForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Objetivo
                </label>
                <input
                  type="text"
                  placeholder="Ganancia muscular / Fuerza"
                  {...planForm.register('goal')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {planForm.formState.errors.goal && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {planForm.formState.errors.goal.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={planForm.formState.isSubmitting}
                className="w-full rounded-lg bg-yellow-400 py-2.5 font-bold text-neutral-950 transition hover:bg-yellow-300 disabled:opacity-50 cursor-pointer"
              >
                {planForm.formState.isSubmitting ? 'Creando...' : 'Crear Rutina'}
              </button>
            </form>
          </div>

          {/* 2. Añadir ejercicio a rutina existente */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Añadir Ejercicio a Rutina
            </h2>

            <form
              onSubmit={routineExerciseForm.handleSubmit(handleAddRoutineExercise)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Rutina destino
                </label>
                <select
                  {...routineExerciseForm.register('workoutPlanId')}
                  defaultValue=""
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecciona una rutina
                  </option>
                  {allPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} —{' '}
                      {p.member
                        ? `${p.member.firstName} ${p.member.lastName}`
                        : 'Socio'}
                    </option>
                  ))}
                </select>
                {routineExerciseForm.formState.errors.workoutPlanId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {routineExerciseForm.formState.errors.workoutPlanId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Ejercicio del catálogo
                </label>
                <select
                  {...routineExerciseForm.register('exerciseId')}
                  defaultValue=""
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecciona un ejercicio
                  </option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.targetMuscleGroup})
                    </option>
                  ))}
                </select>
                {routineExerciseForm.formState.errors.exerciseId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {routineExerciseForm.formState.errors.exerciseId.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Series
                  </label>
                  <input
                    type="number"
                    {...routineExerciseForm.register('targetSets', {
                      valueAsNumber: true,
                    })}
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Reps
                  </label>
                  <input
                    type="number"
                    {...routineExerciseForm.register('targetReps', {
                      valueAsNumber: true,
                    })}
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Orden #
                  </label>
                  <input
                    type="number"
                    {...routineExerciseForm.register('orderIndex', {
                      valueAsNumber: true,
                    })}
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Notas / Descanso (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Descanso 90 seg entre series"
                  {...routineExerciseForm.register('notes')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={routineExerciseForm.formState.isSubmitting}
                className="w-full rounded-lg bg-white py-2.5 font-bold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-50 cursor-pointer"
              >
                {routineExerciseForm.formState.isSubmitting
                  ? 'Añadiendo...'
                  : 'Agregar a la Rutina'}
              </button>
            </form>
          </div>

          {/* 3. Agregar ejercicio al catálogo */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Nuevo Ejercicio en Catálogo
            </h2>

            <form
              onSubmit={exerciseForm.handleSubmit(handleCreateExercise)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Nombre del ejercicio
                </label>
                <input
                  type="text"
                  placeholder="Press de banca plano"
                  {...exerciseForm.register('name')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {exerciseForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {exerciseForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Grupo muscular
                </label>
                <input
                  type="text"
                  placeholder="Pecho / Espalda / Pierna"
                  {...exerciseForm.register('targetMuscleGroup')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {exerciseForm.formState.errors.targetMuscleGroup && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {exerciseForm.formState.errors.targetMuscleGroup.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Equipo necesario (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Barra olímpica y banco"
                  {...exerciseForm.register('equipmentNeeded')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  URL de video demostrativo (opcional)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  {...exerciseForm.register('videoUrl')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={exerciseForm.formState.isSubmitting}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-2.5 font-bold text-white transition hover:bg-neutral-700 disabled:opacity-50 cursor-pointer"
              >
                {exerciseForm.formState.isSubmitting
                  ? 'Guardando...'
                  : 'Guardar en Catálogo'}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Listado de Rutinas y sus Ejercicios */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">
          {canManage ? 'Rutinas Asignadas' : 'Mis Rutinas de Entrenamiento'}
        </h2>

        {loadingPlans ? (
          <p className="text-sm text-neutral-400">Cargando rutinas...</p>
        ) : visiblePlans.length === 0 ? (
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-sm text-neutral-400">
            No hay rutinas registradas todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visiblePlans.map((plan) => {
              const sortedExercises = [...(plan.routineExercises ?? [])].sort(
                (a, b) => a.orderIndex - b.orderIndex,
              );

              return (
                <div
                  key={plan.id}
                  className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{plan.title}</h3>
                        <p className="text-xs text-yellow-400 font-medium mt-0.5">
                          Objetivo: {plan.goal}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase ${
                            plan.isActive
                              ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {plan.isActive ? 'Activa' : 'Inactiva'}
                        </span>

                        {canManage && (
                          <button
                            type="button"
                            disabled={busyId === plan.id}
                            onClick={() =>
                              handleTogglePlanStatus(plan.id, plan.isActive)
                            }
                            className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                          >
                            {plan.isActive ? 'Pausar' : 'Activar'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-400">
                      <span>
                        Socio:{' '}
                        <strong className="text-neutral-200">
                          {plan.member
                            ? `${plan.member.firstName} ${plan.member.lastName}`
                            : plan.memberId}
                        </strong>
                      </span>
                      <span>
                        Coach:{' '}
                        <strong className="text-neutral-200">
                          {plan.trainer
                            ? `${plan.trainer.firstName} ${plan.trainer.lastName}`
                            : plan.trainerId}
                        </strong>
                      </span>
                    </div>

                    {/* Lista de ejercicios dentro de la rutina */}
                    <div className="mt-4 space-y-2">
                      {sortedExercises.length === 0 ? (
                        <p className="rounded-xl bg-neutral-950 border border-neutral-800 p-3 text-xs text-neutral-500">
                          Esta rutina aún no tiene ejercicios asignados.
                        </p>
                      ) : (
                        sortedExercises.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl bg-neutral-950 border border-neutral-800/90 p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-yellow-400/15 text-[11px] font-bold text-yellow-400">
                                  {item.orderIndex}
                                </span>
                                <p className="truncate text-sm font-semibold text-white">
                                  {item.exercise?.name ?? 'Ejercicio'}
                                </p>
                                {item.exercise?.targetMuscleGroup && (
                                  <span className="rounded bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-400">
                                    {item.exercise.targetMuscleGroup}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-neutral-400">
                                <span className="text-yellow-400 font-semibold">
                                  {item.targetSets} series × {item.targetReps} reps
                                </span>
                                {item.notes ? ` · ${item.notes}` : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.exercise?.videoUrl && (
                                <a
                                  href={item.exercise.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded bg-neutral-800 px-2 py-1 text-[11px] font-medium text-yellow-400 hover:bg-neutral-700"
                                >
                                  Video
                                </a>
                              )}

                              {canManage && (
                                <button
                                  type="button"
                                  disabled={busyId === item.id}
                                  onClick={() => handleDeleteRoutineExercise(item.id)}
                                  className="text-xs text-red-400 hover:underline cursor-pointer"
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}