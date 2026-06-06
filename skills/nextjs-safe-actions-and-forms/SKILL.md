---
name: nextjs-safe-actions-and-forms
description: >
  Actúa como el Next.js Actions & Forms Developer para Virtud Gym. Úsalo para crear
  Server Actions seguros utilizando next-safe-action (authActionClient) y vincularlos
  a react-hook-form y esquemas Zod en el cliente.
---

# ⚡ Next.js Safe Actions & Forms - Virtud Gym

## Overview
Esta skill define los estándares del proyecto para implementar mutaciones de datos del lado del servidor (Server Actions) de forma segura y validada utilizando la librería `next-safe-action`, y su respectivo consumo reactivo en formularios del frontend.

---

## 🏗️ Implementación Estándar de Acciones de Servidor

Cualquier operación de mutación (creación, edición, borrado) en la base de datos que requiera una sesión de usuario válida debe implementarse utilizando el cliente protegido **`authActionClient`**:

### 1. Definición de la Acción (Servidor)
Crea la acción en la carpeta `src/actions/` exportando una constante y definiendo el esquema de validación Zod:
```typescript
// src/actions/objetivos.ts
'use server';

import { authActionClient } from './safe-action';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Definir el esquema estricto de entrada con Zod
export const crearObjetivoSchema = z.object({
  descripcion: z.string().min(5, 'La descripción debe tener al menos 5 caracteres'),
  tipo_objetivo: z.enum(['fuerza', 'hipertrofia', 'resistencia', 'perdida_peso']),
  fecha_limite: z.string().datetime(),
});

export const crearObjetivoAction = authActionClient
  .schema(crearObjetivoSchema)
  .action(async ({ parsedInput, ctx }) => {
    // 1. Obtener la sesión y cliente Supabase ya inyectados en el contexto (ctx) por el middleware de safe-action
    const { user, supabase } = ctx;

    // 2. Realizar lógica de base de datos de manera segura utilizando los claims confiables de la sesión
    const { data, error } = await supabase
      .from('objetivos_del_usuario')
      .insert({
        usuario_id: user.id, // Se lee de la sesión inyectada, no del input del cliente
        descripcion: parsedInput.descripcion,
        tipo: parsedInput.tipo_objetivo,
        fecha_meta: parsedInput.fecha_limite,
        esta_activo: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error en base de datos: ${error.message}`);
    }

    // 3. Revalidar rutas para actualizar el caché de Next.js
    revalidatePath('/dashboard');
    return { success: true, data };
  });
```

---

## 🎨 Consumo de Acciones en Formularios del Cliente

En el cliente, consume la acción vinculándola con **`react-hook-form`** y **`react-hot-toast`** para feedback visual:

```tsx
// src/components/features/objetivos/FormularioObjetivo.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { crearObjetivoAction, crearObjetivoSchema } from '@/actions/objetivos';
import toast from 'react-hot-toast';

type FormInputs = z.infer<typeof crearObjetivoSchema>;

export function FormularioObjetivo() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInputs>({
    resolver: zodResolver(crearObjetivoSchema),
  });

  // Utilizar hook reactivo de next-safe-action
  const { execute, isPending } = useAction(crearObjetivoAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success('Objetivo guardado correctamente');
        reset();
      }
    },
    onError: ({ error }) => {
      // Manejar fallos de validación o excepciones de servidor
      toast.error(error.serverError || 'Error al guardar el objetivo');
    }
  });

  const onSubmit = (data: FormInputs) => {
    execute(data); // Ejecuta la acción asíncrona en el servidor
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-white text-xs block mb-1">Descripción del Objetivo</label>
        <input {...register('descripcion')} className="bg-zinc-900 border text-white rounded p-2 w-full" />
        {errors.descripcion && <span className="text-red-500 text-xs">{errors.descripcion.message}</span>}
      </div>

      <button type="submit" disabled={isPending} className="bg-cyan-400 text-black px-4 py-2 rounded font-bold">
        {isPending ? 'Guardando...' : 'Crear Objetivo'}
      </button>
    </form>
  );
}
```

---

## Common Mistakes
1. **Confiar en el `usuario_id` del input:** Pasar el `usuario_id` como un parámetro del formulario en el cliente e insertarlo en la base de datos sin validar. Un usuario malicioso podría alterar el ID y guardar registros en la cuenta de otra persona. Lee siempre el `id` desde el contexto del token JWT (`ctx.user.id`).
2. **Ignorar Revalidación de Rutas:** Modificar tablas de base de datos desde una acción y olvidar llamar a `revalidatePath()`, causando que el usuario sea redirigido a una página que aún muestra datos viejos debido al cache en caché de Next.js Server Components.
3. **No Deshabilitar Botones de Envío:** No utilizar el flag `isPending` de la acción en los botones de Submit, permitiendo que el usuario haga múltiples clics y duplique registros en la base de datos.
