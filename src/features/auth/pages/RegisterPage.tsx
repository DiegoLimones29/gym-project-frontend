import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createMemberProfileRequest,
  createUserRequest,
  createWorkerProfileRequest,
  fetchRolesRequest,
} from "../api";
import {
  RegisterStepUser,
  StepUserFormData,
} from "../components/RegisterStepUser";
import {
  RegisterStepMember,
  StepMemberFormData,
} from "../components/RegisterStepMember";
import {
  RegisterStepWorker,
  StepWorkerFormData,
} from "../components/RegisterStepWorker";

export function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRolesRequest,
  });

  const handleUserSubmit = async (data: StepUserFormData) => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const newUser = await createUserRequest(data);
      const roleObj = roles.find((r) => r.id === data.roleId);

      setCreatedUserId(newUser.id);
      setSelectedRoleName(roleObj?.name.toLowerCase() ?? "member");
      setStep(2);
    } catch (error: any) {
      const msg =
        error.response?.data?.message || "Error al registrar el usuario";
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMemberSubmit = async (data: StepMemberFormData) => {
    if (!createdUserId) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await createMemberProfileRequest({
        userId: createdUserId,
        phone: data.phone,
        birthDate: data.birthDate,
        ...(data.emergencyContactPhone && {
          emergencyContactPhone: data.emergencyContactPhone,
        }),
      });

      resetWizard("Miembro registrado correctamente con su perfil.");
    } catch (error: any) {
      const msg =
        error.response?.data?.message || "Error al guardar perfil de miembro";
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkerSubmit = async (data: StepWorkerFormData) => {
    if (!createdUserId) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await createWorkerProfileRequest({
        userId: createdUserId,
        area: data.area,
        shift: data.shift,
      });

      resetWizard("Trabajador registrado correctamente con su perfil.");
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        "Error al guardar perfil de trabajador";
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = (message: string) => {
    setSuccessMsg(message);
    setStep(1);
    setCreatedUserId(null);
    setSelectedRoleName("");
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Registro de Usuario</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {step === 1
            ? "Paso 1 de 2 · Credenciales y rol de acceso"
            : `Paso 2 de 2 · Perfil de ${selectedRoleName === "member" ? "Miembro" : "Trabajador"}`}
        </p>

        {}
        <div className="mt-4 flex gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-yellow-400" />
          <div
            className={`h-1.5 flex-1 rounded-full transition ${
              step === 2 ? "bg-yellow-400" : "bg-neutral-800"
            }`}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-xl">
        {successMsg && (
          <div className="mb-4 rounded-lg bg-yellow-400/10 border border-yellow-400/40 p-3 text-sm text-yellow-300">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/40 p-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {step === 1 && (
          <RegisterStepUser
            roles={roles}
            isLoadingRoles={isLoadingRoles}
            serverError={null}
            onSubmitUser={handleUserSubmit}
          />
        )}

        {step === 2 && selectedRoleName === "member" && (
          <RegisterStepMember
            isSubmitting={isSubmitting}
            onSubmitStep={handleMemberSubmit}
          />
        )}

        {step === 2 && selectedRoleName !== "member" && (
          <RegisterStepWorker
            isSubmitting={isSubmitting}
            onSubmitStep={handleWorkerSubmit}
          />
        )}
      </div>
    </div>
  );
}
