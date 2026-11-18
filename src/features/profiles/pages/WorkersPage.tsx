import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchWorkersRequest } from "../api";

export function WorkersPage() {
  const {
    data: workers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["worker-profile"],
    queryFn: fetchWorkersRequest,
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Trabajadores</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Personal, entrenadores y turnos asignados
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
            Cargando trabajadores...
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-400">
            Error al cargar la lista de trabajadores.
          </div>
        ) : workers.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-400">
            Aún no hay trabajadores registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-5 py-3.5">Nombre</th>
                  <th className="px-5 py-3.5">Correo</th>
                  <th className="px-5 py-3.5">Área</th>
                  <th className="px-5 py-3.5">Turno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {workers.map((worker) => (
                  <tr
                    key={worker.id}
                    className="hover:bg-neutral-800/50 transition"
                  >
                    <td className="px-5 py-4 font-medium text-white">
                      {worker.user
                        ? `${worker.user.firstName} ${worker.user.lastName}`
                        : "Sin usuario"}
                    </td>
                    <td className="px-5 py-4 text-neutral-300">
                      {worker.user?.email ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-medium text-white">
                        {worker.area}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-yellow-400/10 border border-yellow-400/30 px-2.5 py-1 text-xs font-semibold text-yellow-400">
                        {worker.shift}
                      </span>
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
