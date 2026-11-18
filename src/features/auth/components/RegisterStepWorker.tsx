import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const stepWorkerSchema = z.object({
  area: z.string().min(2, "El área es obligatoria"),
  shift: z.string().min(2, "El turno es obligatorio"),
});

export type StepWorkerFormData = z.infer<typeof stepWorkerSchema>;

interface RegisterStepWorkerProps {
  isSubmitting: boolean;
  onSubmitStep: (data: StepWorkerFormData) => Promise<void>;
}

export function RegisterStepWorker({
  isSubmitting,
  onSubmitStep,
}: RegisterStepWorkerProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepWorkerFormData>({
    resolver: zodResolver(stepWorkerSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmitStep)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-1">
          Área asignada
        </label>
        <select
          {...register("area")}
          defaultValue=""
          className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
        >
          <option value="" disabled>
            Selecciona un área
          </option>
          <option value="Piso y Pesas">Piso y Pesas</option>
          <option value="Clases Grupales">Clases Grupales</option>
          <option value="Recepción">Recepción</option>
          <option value="Evaluación Física">Evaluación Física</option>
          <option value="Administración">Administración</option>
        </select>
        {errors.area && (
          <p className="mt-1 text-xs text-yellow-400">{errors.area.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-1">
          Turno
        </label>
        <select
          {...register("shift")}
          defaultValue=""
          className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
        >
          <option value="" disabled>
            Selecciona un turno
          </option>
          <option value="Matutino">Matutino</option>
          <option value="Vespertino">Vespertino</option>
          <option value="Nocturno">Nocturno</option>
          <option value="Completo">Completo</option>
        </select>
        {errors.shift && (
          <p className="mt-1 text-xs text-yellow-400">{errors.shift.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-yellow-400 py-2.5 font-bold text-neutral-950 transition hover:bg-yellow-300 disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting
          ? "Guardando perfil..."
          : "Finalizar registro de trabajador"}
      </button>
    </form>
  );
}
