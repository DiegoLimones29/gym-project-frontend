import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const stepMemberSchema = z.object({
  phone: z.string().min(8, "Ingresa un teléfono válido"),
  birthDate: z.string().min(1, "La fecha de nacimiento es obligatoria"),
  emergencyContactPhone: z.string().optional(),
});

export type StepMemberFormData = z.infer<typeof stepMemberSchema>;

interface RegisterStepMemberProps {
  isSubmitting: boolean;
  onSubmitStep: (data: StepMemberFormData) => Promise<void>;
}

export function RegisterStepMember({
  isSubmitting,
  onSubmitStep,
}: RegisterStepMemberProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepMemberFormData>({
    resolver: zodResolver(stepMemberSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmitStep)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-1">
          Teléfono
        </label>
        <input
          type="tel"
          placeholder="8711234567"
          {...register("phone")}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-yellow-400">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-1">
          Fecha de nacimiento
        </label>
        <input
          type="date"
          {...register("birthDate")}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white focus:border-yellow-400 focus:outline-none"
        />
        {errors.birthDate && (
          <p className="mt-1 text-xs text-yellow-400">
            {errors.birthDate.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-1">
          Teléfono de emergencia (opcional)
        </label>
        <input
          type="tel"
          placeholder="8719876543"
          {...register("emergencyContactPhone")}
          className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-yellow-400 py-2.5 font-bold text-neutral-950 transition hover:bg-yellow-300 disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? "Guardando perfil..." : "Finalizar registro de miembro"}
      </button>
    </form>
  );
}
