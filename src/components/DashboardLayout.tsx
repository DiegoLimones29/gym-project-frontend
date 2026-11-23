import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useRealtime } from '../realtime/RealtimeContext';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { status, lastEvent } = useRealtime();
  const [pulseSync, setPulseSync] = useState(false);

  useEffect(() => {
    if (!lastEvent) return;
    setPulseSync(true);
    const timer = setTimeout(() => setPulseSync(false), 900);
    return () => clearTimeout(timer);
  }, [lastEvent]);

  const role = user?.roleId === 7 ? 'admin' : (user?.role ?? 'worker');

  const navItems = [
    { to: '/dashboard', label: 'Resumen', end: true, roles: ['admin', 'worker'] },
    { to: '/dashboard/register', label: 'Registrar Usuario', roles: ['admin', 'worker'] },
    { to: '/dashboard/members', label: 'Miembros', roles: ['admin', 'worker'] },
    { to: '/dashboard/workers', label: 'Trabajadores', roles: ['admin'] },
    { to: '/dashboard/plans', label: 'Planes y Suscripciones', roles: ['admin', 'worker'] },
    { to: '/dashboard/classes', label: 'Clases y Horarios', roles: ['admin', 'worker'] },
    { to: '/dashboard/workouts', label: 'Rutinas y Ejercicios', roles: ['admin', 'worker'] },
    { to: '/dashboard/assessments', label: 'Evaluaciones Físicas', roles: ['admin', 'worker'] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  const statusConfig =
    status === 'connected'
      ? {
          dotClass: 'bg-emerald-400',
          label: pulseSync ? 'Actualizado en vivo' : 'En vivo',
          textClass: 'text-emerald-400',
        }
      : status === 'connecting' || status === 'reconnecting'
        ? {
            dotClass: 'bg-yellow-400 animate-pulse',
            label: status === 'connecting' ? 'Conectando...' : 'Reconectando...',
            textClass: 'text-yellow-400',
          }
        : {
            dotClass: 'bg-neutral-500',
            label: 'Sin conexión',
            textClass: 'text-neutral-400',
          };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-neutral-900 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="flex items-center justify-between gap-2 px-2 py-3 mb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-3 w-3 rounded-full bg-yellow-400 shrink-0" />
              <span className="text-sm font-extrabold tracking-wider uppercase text-white truncate">
                Panel de Control
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block rounded-lg px-3.5 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-yellow-400 text-neutral-950'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="pt-4 mt-6 border-t border-neutral-800 space-y-3">
          <div className="px-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-2 w-2 rounded-full shrink-0 transition-transform ${statusConfig.dotClass} ${
                  pulseSync ? 'scale-125' : ''
                }`}
              />
              <span className={`text-[11px] font-semibold truncate ${statusConfig.textClass}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          <div className="px-2">
            <p className="truncate text-xs font-medium text-neutral-300">
              {user?.email}
            </p>
            <span className="mt-1 inline-block rounded bg-neutral-800 px-2 py-0.5 text-[11px] font-bold uppercase text-yellow-400">
              {role}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 text-xs font-semibold text-neutral-300 hover:border-red-500/40 hover:text-red-400 transition cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
