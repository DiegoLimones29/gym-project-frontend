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
  cancelClassBookingRequest,
  createClassBookingRequest,
  createClassScheduleRequest,
  createFitnessClassRequest,
  fetchClassSchedulesRequest,
  fetchFitnessClassesRequest,
  updateClassScheduleStatusRequest,
} from '../api';

// Opciones de hora cada 30 min (06:00 a 22:30)
const TIME_OPTIONS = Array.from({ length: 34 }, (_, idx) => {
  const totalMinutes = 6 * 60 + idx * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  const value = `${hours}:${minutes}`;
  const hour12 = Number(hours) % 12 || 12;
  const ampm = Number(hours) < 12 ? 'AM' : 'PM';
  return {
    value,
    label: `${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`,
  };
});

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEK_DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function toLocalDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface InlineCalendarProps {
  value: string;
  onChange: (dateStr: string) => void;
}

function InlineCalendar({ value, onChange }: InlineCalendarProps) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const todayStr = toLocalDateStr(new Date());

  const daysGrid = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(d);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-3.5">
      {/* Cabecera del mes */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="rounded-lg bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs font-bold text-neutral-300 hover:border-yellow-400/50 hover:text-white cursor-pointer"
        >
          ←
        </button>
        <span className="text-sm font-bold text-white">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="rounded-lg bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs font-bold text-neutral-300 hover:border-yellow-400/50 hover:text-white cursor-pointer"
        >
          →
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEK_DAYS.map((day) => (
          <span key={day} className="text-[11px] font-semibold text-neutral-500 py-1">
            {day}
          </span>
        ))}
      </div>

      {/* Cuadrícula de días */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {daysGrid.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = value === dateStr;
          const isToday = todayStr === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onChange(dateStr)}
              className={`h-8 w-full rounded-lg text-xs font-semibold transition cursor-pointer ${
                isSelected
                  ? 'bg-yellow-400 text-neutral-950 font-bold shadow'
                  : isToday
                    ? 'border border-yellow-400/50 text-yellow-400 hover:bg-neutral-900'
                    : 'text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const createClassSchema = z.object({
  name: z.string().min(2, 'Nombre obligatorio'),
  description: z.string().min(4, 'Descripción obligatoria'),
  capacity: z
    .number({ message: 'Ingresa el cupo' })
    .int('Debe ser entero')
    .positive('Mínimo 1 lugar'),
});

type CreateClassFormData = z.infer<typeof createClassSchema>;

const createScheduleSchema = z
  .object({
    classId: z.string().uuid('Selecciona una clase'),
    trainerId: z.string().uuid('Selecciona un entrenador'),
    roomName: z.string().min(2, 'Sala obligatoria'),
    date: z.string().min(1, 'Selecciona una fecha en el calendario'),
    startHour: z.string().min(1, 'Selecciona hora de inicio'),
    endHour: z.string().min(1, 'Selecciona hora de fin'),
  })
  .refine((data) => data.endHour > data.startHour, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endHour'],
  });

type CreateScheduleFormData = z.infer<typeof createScheduleSchema>;

const bookMemberSchema = z.object({
  classScheduleId: z.string().uuid('Selecciona un horario'),
  memberId: z.string().uuid('Busca y selecciona un socio'),
});

type BookMemberFormData = z.infer<typeof bookMemberSchema>;

export function ClassesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role ?? 'member';
  const canManage = role === 'admin' || role === 'worker';

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

  // Buscador de socio por correo para reservación manual
  const [emailQuery, setEmailQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberProfileItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['class-schedules'],
    queryFn: fetchClassSchedulesRequest,
  });

  const { data: fitnessClasses = [] } = useQuery({
    queryKey: ['fitness-classes'],
    queryFn: fetchFitnessClassesRequest,
    enabled: canManage,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['worker-profile'],
    queryFn: fetchWorkersRequest,
    enabled: canManage,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members-profile'],
    queryFn: fetchMembersRequest,
    enabled: canManage,
  });

  const filteredMembers = useMemo(() => {
    const term = emailQuery.trim().toLowerCase();
    if (!term) return members.slice(0, 6);
    return members.filter((m) => {
      const email = m.user?.email?.toLowerCase() ?? '';
      const fullName = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.toLowerCase();
      return email.includes(term) || fullName.includes(term);
    });
  }, [members, emailQuery]);

  const classForm = useForm<CreateClassFormData>({
    resolver: zodResolver(createClassSchema),
  });

  const todayDefault = toLocalDateStr(new Date());

  const scheduleForm = useForm<CreateScheduleFormData>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      date: todayDefault,
      startHour: '09:00',
      endHour: '10:00',
    },
  });

  const selectedDate = scheduleForm.watch('date');

  const bookingForm = useForm<BookMemberFormData>({
    resolver: zodResolver(bookMemberSchema),
    defaultValues: { memberId: '', classScheduleId: '' },
  });

  const handleSelectMember = (member: MemberProfileItem) => {
    setSelectedMember(member);
    setEmailQuery(member.user?.email ?? '');
    setIsDropdownOpen(false);
    bookingForm.setValue('memberId', member.userId, { shouldValidate: true });
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setEmailQuery('');
    bookingForm.setValue('memberId', '', { shouldValidate: false });
  };

  const handleCreateClass = async (data: CreateClassFormData) => {
    try {
      setFeedback(null);
      await createFitnessClassRequest(data);
      classForm.reset();
      await queryClient.invalidateQueries({ queryKey: ['fitness-classes'] });
      setFeedback({ type: 'ok', text: 'Clase agregada al catálogo.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al crear la clase';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    }
  };

  const handleCreateSchedule = async (data: CreateScheduleFormData) => {
    try {
      setFeedback(null);
      const startIso = new Date(`${data.date}T${data.startHour}:00`).toISOString();
      const endIso = new Date(`${data.date}T${data.endHour}:00`).toISOString();

      await createClassScheduleRequest({
        classId: data.classId,
        trainerId: data.trainerId,
        roomName: data.roomName,
        startTime: startIso,
        endTime: endIso,
      });
      scheduleForm.reset({
        classId: '',
        trainerId: '',
        roomName: '',
        date: data.date,
        startHour: '09:00',
        endHour: '10:00',
      });
      await queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      setFeedback({ type: 'ok', text: 'Horario programado correctamente.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al programar el horario';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    }
  };

  const handleBookMember = async (data: BookMemberFormData) => {
    try {
      setFeedback(null);
      await createClassBookingRequest(data);
      bookingForm.reset({ memberId: '', classScheduleId: '' });
      setSelectedMember(null);
      setEmailQuery('');
      await queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      setFeedback({ type: 'ok', text: 'Lugar reservado para el socio.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al realizar la reserva';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    }
  };

  const handleSelfBook = async (classScheduleId: string) => {
    if (!user?.id) return;
    try {
      setBusyId(classScheduleId);
      setFeedback(null);
      await createClassBookingRequest({
        classScheduleId,
        memberId: user.id,
      });
      await queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      setFeedback({ type: 'ok', text: 'Tu lugar ha sido reservado.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'No se pudo completar la reserva';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      setBusyId(bookingId);
      setFeedback(null);
      await cancelClassBookingRequest(bookingId);
      await queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      setFeedback({ type: 'ok', text: 'Reservación cancelada y lugar liberado.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al cancelar reserva';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      setBusyId(scheduleId);
      setFeedback(null);
      await updateClassScheduleStatusRequest(scheduleId, 'cancelled');
      await queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      setFeedback({ type: 'ok', text: 'Sesión marcada como cancelada.' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al cancelar la sesión';
      setFeedback({ type: 'err', text: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Clases y Horarios</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Sesiones grupales, entrenadores asignados y control de cupo
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

      {/* Cartelera de horarios */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">
          Sesiones Programadas
        </h2>

        {loadingSchedules ? (
          <p className="text-sm text-neutral-400">Cargando horarios...</p>
        ) : schedules.length === 0 ? (
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-sm text-neutral-400">
            No hay horarios programados todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {schedules.map((sch) => {
              const confirmedBookings = (sch.classBookings ?? []).filter(
                (b) => b.bookingStatus === 'confirmed',
              );
              const capacity = sch.fitnessClass?.capacity ?? 0;
              const isFull = confirmedBookings.length >= capacity;
              const isCancelled = sch.status !== 'scheduled';

              const myBooking = confirmedBookings.find(
                (b) => b.memberId === user?.id,
              );

              const start = new Date(sch.startTime);
              const end = new Date(sch.endTime);

              return (
                <div
                  key={sch.id}
                  className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col justify-between hover:border-yellow-400/40 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {sch.fitnessClass?.name ?? 'Clase'}
                        </h3>
                        <p className="text-xs text-yellow-400 font-medium mt-0.5">
                          Sala: {sch.roomName}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${
                          isCancelled
                            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                            : isFull
                              ? 'bg-neutral-800 text-neutral-400'
                              : 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
                        }`}
                      >
                        {isCancelled
                          ? 'Cancelada'
                          : `${confirmedBookings.length} / ${capacity} lugares`}
                      </span>
                    </div>

                    {sch.fitnessClass?.description && (
                      <p className="mt-2 text-sm text-neutral-400 line-clamp-2">
                        {sch.fitnessClass.description}
                      </p>
                    )}

                    <div className="mt-4 space-y-1 text-xs text-neutral-300 bg-neutral-950 rounded-xl p-3 border border-neutral-800/80">
                      <p>
                        <span className="text-neutral-500">Entrenador:</span>{' '}
                        {sch.trainer
                          ? `${sch.trainer.firstName} ${sch.trainer.lastName}`
                          : 'Por asignar'}
                      </p>
                      <p>
                        <span className="text-neutral-500">Fecha:</span>{' '}
                        {start.toLocaleDateString('es-MX', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                      <p>
                        <span className="text-neutral-500">Horario:</span>{' '}
                        {start.toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {end.toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Acciones por rol */}
                  <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
                    {!canManage && !isCancelled && (
                      myBooking ? (
                        <button
                          type="button"
                          disabled={busyId === myBooking.id}
                          onClick={() => handleCancelBooking(myBooking.id)}
                          className="w-full rounded-lg border border-red-500/40 bg-red-500/10 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50 cursor-pointer"
                        >
                          {busyId === myBooking.id
                            ? 'Cancelando...'
                            : 'Cancelar mi reserva'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isFull || busyId === sch.id}
                          onClick={() => handleSelfBook(sch.id)}
                          className="w-full rounded-lg bg-yellow-400 py-2 text-xs font-bold text-neutral-950 hover:bg-yellow-300 disabled:opacity-40 cursor-pointer"
                        >
                          {isFull
                            ? 'Cupo lleno'
                            : busyId === sch.id
                              ? 'Reservando...'
                              : 'Reservar lugar'}
                        </button>
                      )
                    )}

                    {canManage && (
                      <>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedScheduleId(
                                expandedScheduleId === sch.id ? null : sch.id,
                              )
                            }
                            className="flex-1 rounded-lg bg-neutral-800 py-2 text-xs font-semibold text-white hover:bg-neutral-700 cursor-pointer"
                          >
                            {expandedScheduleId === sch.id
                              ? 'Ocultar inscritos'
                              : `Ver inscritos (${confirmedBookings.length})`}
                          </button>

                          {!isCancelled && (
                            <button
                              type="button"
                              disabled={busyId === sch.id}
                              onClick={() => handleCancelSchedule(sch.id)}
                              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 cursor-pointer"
                            >
                              Cancelar sesión
                            </button>
                          )}
                        </div>

                        {expandedScheduleId === sch.id && (
                          <div className="mt-2 rounded-xl bg-neutral-950 border border-neutral-800 p-3 space-y-2">
                            {confirmedBookings.length === 0 ? (
                              <p className="text-xs text-neutral-500">
                                Sin socios inscritos aún.
                              </p>
                            ) : (
                              confirmedBookings.map((b) => (
                                <div
                                  key={b.id}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <span className="truncate text-neutral-200">
                                    {b.member
                                      ? `${b.member.firstName} ${b.member.lastName}`
                                      : b.memberId}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={busyId === b.id}
                                    onClick={() => handleCancelBooking(b.id)}
                                    className="shrink-0 text-red-400 hover:underline cursor-pointer"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Panel de gestión para Admin y Worker */}
      {canManage && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* 1. Inscribir socio a una clase */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Reservar Lugar a Socio
            </h2>

            <form
              onSubmit={bookingForm.handleSubmit(handleBookMember)}
              className="space-y-4"
            >
              <div className="relative">
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Buscar socio por correo
                </label>
                <input type="hidden" {...bookingForm.register('memberId')} />

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

                {bookingForm.formState.errors.memberId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {bookingForm.formState.errors.memberId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Horario disponible
                </label>
                <select
                  {...bookingForm.register('classScheduleId')}
                  defaultValue=""
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecciona una sesión
                  </option>
                  {schedules
                    .filter((s) => s.status === 'scheduled')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fitnessClass?.name} —{' '}
                        {new Date(s.startTime).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </option>
                    ))}
                </select>
                {bookingForm.formState.errors.classScheduleId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {bookingForm.formState.errors.classScheduleId.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={bookingForm.formState.isSubmitting}
                className="w-full rounded-lg bg-yellow-400 py-2.5 font-bold text-neutral-950 transition hover:bg-yellow-300 disabled:opacity-50 cursor-pointer"
              >
                {bookingForm.formState.isSubmitting
                  ? 'Reservando...'
                  : 'Confirmar Reserva'}
              </button>
            </form>
          </div>

          {/* 2. Programar nuevo horario con Calendario + Selector de Hora */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Programar Horario
            </h2>

            <form
              onSubmit={scheduleForm.handleSubmit(handleCreateSchedule)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Clase
                </label>
                <select
                  {...scheduleForm.register('classId')}
                  defaultValue=""
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecciona una clase
                  </option>
                  {fitnessClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Cupo: {c.capacity})
                    </option>
                  ))}
                </select>
                {scheduleForm.formState.errors.classId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {scheduleForm.formState.errors.classId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Entrenador
                </label>
                <select
                  {...scheduleForm.register('trainerId')}
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
                {scheduleForm.formState.errors.trainerId && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {scheduleForm.formState.errors.trainerId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Sala / Área
                </label>
                <input
                  type="text"
                  placeholder="Salón Funcional"
                  {...scheduleForm.register('roomName')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {scheduleForm.formState.errors.roomName && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {scheduleForm.formState.errors.roomName.message}
                  </p>
                )}
              </div>

              {/* Calendario visual */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-neutral-200">
                    Fecha de la sesión
                  </label>
                  {selectedDate && (
                    <span className="text-xs font-semibold text-yellow-400">
                      {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                        'es-MX',
                        {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        },
                      )}
                    </span>
                  )}
                </div>

                <input type="hidden" {...scheduleForm.register('date')} />
                <InlineCalendar
                  value={selectedDate}
                  onChange={(newDate) =>
                    scheduleForm.setValue('date', newDate, { shouldValidate: true })
                  }
                />
                {scheduleForm.formState.errors.date && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {scheduleForm.formState.errors.date.message}
                  </p>
                )}
              </div>

              {/* Selectores de hora inicio y fin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Hora de inicio
                  </label>
                  <select
                    {...scheduleForm.register('startHour')}
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2.5 text-sm text-white focus:border-yellow-400 focus:outline-none"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`start-${t.value}`} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Hora de fin
                  </label>
                  <select
                    {...scheduleForm.register('endHour')}
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2.5 text-sm text-white focus:border-yellow-400 focus:outline-none"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`end-${t.value}`} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {scheduleForm.formState.errors.endHour && (
                <p className="text-xs text-yellow-400">
                  {scheduleForm.formState.errors.endHour.message}
                </p>
              )}

              <button
                type="submit"
                disabled={scheduleForm.formState.isSubmitting}
                className="w-full rounded-lg bg-white py-2.5 font-bold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-50 cursor-pointer"
              >
                {scheduleForm.formState.isSubmitting
                  ? 'Guardando...'
                  : 'Publicar Horario'}
              </button>
            </form>
          </div>

          {/* 3. Crear clase en catálogo */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Nueva Clase en Catálogo
            </h2>

            <form
              onSubmit={classForm.handleSubmit(handleCreateClass)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Nombre de la clase
                </label>
                <input
                  type="text"
                  placeholder="Spinning / CrossFit"
                  {...classForm.register('name')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {classForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {classForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Cupo máximo (personas)
                </label>
                <input
                  type="number"
                  placeholder="15"
                  {...classForm.register('capacity', { valueAsNumber: true })}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {classForm.formState.errors.capacity && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {classForm.formState.errors.capacity.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  placeholder="Entrenamiento cardiovascular de alta intensidad"
                  {...classForm.register('description')}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
                />
                {classForm.formState.errors.description && (
                  <p className="mt-1 text-xs text-yellow-400">
                    {classForm.formState.errors.description.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={classForm.formState.isSubmitting}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-2.5 font-bold text-white transition hover:bg-neutral-700 disabled:opacity-50 cursor-pointer"
              >
                {classForm.formState.isSubmitting ? 'Guardando...' : 'Agregar Clase'}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}