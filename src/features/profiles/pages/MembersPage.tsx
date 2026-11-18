import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchMembersRequest } from '../api';

export function MembersPage() {
  const {
    data: members = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['members-profile'],
    queryFn: fetchMembersRequest,
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Miembros</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Directorio de socios registrados en el gimnasio
          </p>
        </div>

        <Link
          to="/dashboard/register"
          className="inline-flex items-center justify-center rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-neutral-950 transition hover:bg-yellow-300"
        >
          + Nuevo Registro
        </Link>
      </div>

      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-neutral-400">
            Cargando miembros...
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-400">
            Error al cargar la lista de miembros.
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-400">
            Aún no hay miembros registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-5 py-3.5">Nombre</th>
                  <th className="px-5 py-3.5">Correo</th>
                  <th className="px-5 py-3.5">Teléfono</th>
                  <th className="px-5 py-3.5">Nacimiento</th>
                  <th className="px-5 py-3.5">Emergencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-neutral-800/50 transition"
                  >
                    <td className="px-5 py-4 font-medium text-white">
                      {member.user
                        ? `${member.user.firstName} ${member.user.lastName}`
                        : 'Sin usuario'}
                    </td>
                    <td className="px-5 py-4 text-neutral-300">
                      {member.user?.email ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-yellow-400 font-medium">
                      {member.phone}
                    </td>
                    <td className="px-5 py-4 text-neutral-300">
                      {new Date(member.birthDate).toLocaleDateString('es-MX', {
                        timeZone: 'UTC',
                      })}
                    </td>
                    <td className="px-5 py-4 text-neutral-400">
                      {member.emergencyContactPhone || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}