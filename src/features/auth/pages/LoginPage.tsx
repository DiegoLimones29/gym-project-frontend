import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      await login(data);
      navigate('/dashboard');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Credenciales inválidas o error de conexión';
      setServerError(Array.isArray(message) ? message[0] : message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <span className="inline-block h-1.5 w-12 rounded-full bg-yellow-400 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Iniciar Sesión
          </h1>
          <p className="mt-1.5 text-sm text-neutral-400">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              {...register('email')}
              className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none transition"
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-yellow-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-white placeholder-neutral-600 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none transition"
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-yellow-400">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/40 p-3 text-sm text-red-300">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-yellow-400 py-2.5 font-bold text-neutral-950 transition hover:bg-yellow-300 active:bg-yellow-500 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}