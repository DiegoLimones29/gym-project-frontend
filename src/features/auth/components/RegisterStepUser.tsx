import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { RoleOption } from "../api";

const stepUserSchema = z.object({
  firstName: z.string().min(2, "El nombre es obligatorio"),
  lastName: z.string().min(2, "El apellido es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  roleId: z
    .number({ message: "Selecciona un rol" })
    .min(1, "Selecciona un rol"),
});

export type StepUserFormData = z.infer<typeof stepUserSchema>;

interface RegisterStepUserProps {
  roles: RoleOption[];
  isLoadingRoles: boolean;
  isSubmitting: boolean;
  onSubmitStep: (data: StepUserFormData) => Promise<void>;
}

export function RegisterStepUser({
  roles,
  isLoadingRoles,
  isSubmitting,
  onSubmitStep,
}: RegisterStepUserProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepUserFormData>({
    resolver: zodResolver(stepUserSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmitStep)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-1">
            Nombre
          </label>
          <input
            type="text"
            placeholder="Carlos"
            {...register("firstName")}
            className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-yellow-400">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-1">
            Apellido
          </label>
          <input
            type="text"
            placeholder="Ramírez"
            {...register("lastName")}
            className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-yellow-400">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-1">
          Correo electrónico
        </label>
        <input
          type="email"
          placeholder="usuario@ejemplo.com"
          {...register("email")}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-yellow-400">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-1">
          Contraseña
        </label>
        <input
          type="password"
          placeholder="••••••••"
          {...register("password")}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-yellow-400">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-1">
          Tipo de cuenta (Rol)
        </label>
        <select
          {...register("roleId", { valueAsNumber: true })}
          disabled={isLoadingRoles}
          defaultValue=""
          className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
        >
          <option value="" disabled>
            {isLoadingRoles ? "Cargando roles..." : "Selecciona un rol"}
          </option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name.toUpperCase()}
            </option>
          ))}
        </select>
        {errors.roleId && (
          <p className="mt-1 text-xs text-yellow-400">
            {errors.roleId.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isLoadingRoles}
        className="w-full rounded-lg bg-yellow-400 py-2.5 font-bold text-neutral-950 transition hover:bg-yellow-300 disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? "Creando usuario..." : "Continuar al perfil"}
      </button>
    </form>
  );
}
