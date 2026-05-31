export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accesos_qr: {
        Row: {
          alumno_id: string
          creado_en: string
          expira_en: string
          gimnasio_id: string
          id: string
          token_dinamico: string
          usado: boolean
        }
        Insert: {
          alumno_id: string
          creado_en?: string
          expira_en: string
          gimnasio_id: string
          id?: string
          token_dinamico: string
          usado?: boolean
        }
        Update: {
          alumno_id?: string
          creado_en?: string
          expira_en?: string
          gimnasio_id?: string
          id?: string
          token_dinamico?: string
          usado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "accesos_qr_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accesos_qr_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
        ]
      }
      actividades: {
        Row: {
          actualizado_en: string | null
          capacidad_maxima: number | null
          categoria: string | null
          color: string | null
          creado_en: string | null
          descripcion: string | null
          dificultad: string | null
          duracion_minutos: number | null
          esta_activa: boolean | null
          id: string
          nombre: string
          tipo: string
          url_imagen: string | null
        }
        Insert: {
          actualizado_en?: string | null
          capacidad_maxima?: number | null
          categoria?: string | null
          color?: string | null
          creado_en?: string | null
          descripcion?: string | null
          dificultad?: string | null
          duracion_minutos?: number | null
          esta_activa?: boolean | null
          id?: string
          nombre: string
          tipo: string
          url_imagen?: string | null
        }
        Update: {
          actualizado_en?: string | null
          capacidad_maxima?: number | null
          categoria?: string | null
          color?: string | null
          creado_en?: string | null
          descripcion?: string | null
          dificultad?: string | null
          duracion_minutos?: number | null
          esta_activa?: boolean | null
          id?: string
          nombre?: string
          tipo?: string
          url_imagen?: string | null
        }
        Relationships: []
      }
      anuncios_globales: {
        Row: {
          activo: boolean | null
          contenido: string
          creado_en: string | null
          creado_por: string | null
          destino: string | null
          enviado_newsletter: boolean | null
          expires_at: string | null
          fecha_envio_newsletter: string | null
          id: string
          tipo: string | null
          titulo: string
        }
        Insert: {
          activo?: boolean | null
          contenido: string
          creado_en?: string | null
          creado_por?: string | null
          destino?: string | null
          enviado_newsletter?: boolean | null
          expires_at?: string | null
          fecha_envio_newsletter?: string | null
          id?: string
          tipo?: string | null
          titulo: string
        }
        Update: {
          activo?: boolean | null
          contenido?: string
          creado_en?: string | null
          creado_por?: string | null
          destino?: string | null
          enviado_newsletter?: boolean | null
          expires_at?: string | null
          fecha_envio_newsletter?: string | null
          id?: string
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_globales_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencias: {
        Row: {
          creado_en: string | null
          entrada: string | null
          id: string
          rol_asistencia: Database["public"]["Enums"]["user_role"]
          salida: string | null
          source: string | null
          usuario_id: string
        }
        Insert: {
          creado_en?: string | null
          entrada?: string | null
          id?: string
          rol_asistencia: Database["public"]["Enums"]["user_role"]
          salida?: string | null
          source?: string | null
          usuario_id: string
        }
        Update: {
          creado_en?: string | null
          entrada?: string | null
          id?: string
          rol_asistencia?: Database["public"]["Enums"]["user_role"]
          salida?: string | null
          source?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_user_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_coach: {
        Row: {
          cambiado_por: string | null
          creado_en: string | null
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          entrenador_id: string | null
          id: number
          operacion: string | null
          usuario_id: string | null
        }
        Insert: {
          cambiado_por?: string | null
          creado_en?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          entrenador_id?: string | null
          id?: number
          operacion?: string | null
          usuario_id?: string | null
        }
        Update: {
          cambiado_por?: string | null
          creado_en?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          entrenador_id?: string | null
          id?: number
          operacion?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          agente_usuario: string | null
          creado_en: string | null
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          direccion_ip: unknown
          id: string
          operacion: string
          registro_id: string | null
          tabla: string | null
          usuario_id: string | null
        }
        Insert: {
          agente_usuario?: string | null
          creado_en?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          direccion_ip?: unknown
          id?: string
          operacion: string
          registro_id?: string | null
          tabla?: string | null
          usuario_id?: string | null
        }
        Update: {
          agente_usuario?: string | null
          creado_en?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          direccion_ip?: unknown
          id?: string
          operacion?: string
          registro_id?: string | null
          tabla?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campanas_marketing: {
        Row: {
          actualizado_en: string | null
          contenido: string | null
          creado_en: string | null
          estado: string | null
          fecha_envio: string | null
          id: string
          tipo: string | null
          titulo: string
        }
        Insert: {
          actualizado_en?: string | null
          contenido?: string | null
          creado_en?: string | null
          estado?: string | null
          fecha_envio?: string | null
          id?: string
          tipo?: string | null
          titulo: string
        }
        Update: {
          actualizado_en?: string | null
          contenido?: string | null
          creado_en?: string | null
          estado?: string | null
          fecha_envio?: string | null
          id?: string
          tipo?: string | null
          titulo?: string
        }
        Relationships: []
      }
      conversaciones: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          type?: string | null
        }
        Relationships: []
      }
      cuentas_corrientes: {
        Row: {
          actualizado_en: string
          alumno_id: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_cuenta_corriente"]
          gimnasio_id: string
          id: string
          limite_credito: number
          saldo_actual: number
        }
        Insert: {
          actualizado_en?: string
          alumno_id: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_cuenta_corriente"]
          gimnasio_id: string
          id?: string
          limite_credito?: number
          saldo_actual?: number
        }
        Update: {
          actualizado_en?: string
          alumno_id?: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_cuenta_corriente"]
          gimnasio_id?: string
          id?: string
          limite_credito?: number
          saldo_actual?: number
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_corrientes_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_corrientes_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
        ]
      }
      desafios: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          creator_id: string | null
          descripcion: string | null
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          judge_id: string | null
          premio_puntos: number | null
          reglas: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          creator_id?: string | null
          descripcion?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          judge_id?: string | null
          premio_puntos?: number | null
          reglas?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          creator_id?: string | null
          descripcion?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          judge_id?: string | null
          premio_puntos?: number | null
          reglas?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ejercicios: {
        Row: {
          creado_en: string | null
          descanso_segundos: number | null
          dia_numero: number
          equipamiento: string[] | null
          grupo_muscular: string | null
          id: string
          instrucciones: string | null
          nombre: string
          orden_en_dia: number
          repeticiones: string | null
          rutina_id: string
          series: number | null
          url_video: string | null
        }
        Insert: {
          creado_en?: string | null
          descanso_segundos?: number | null
          dia_numero: number
          equipamiento?: string[] | null
          grupo_muscular?: string | null
          id?: string
          instrucciones?: string | null
          nombre: string
          orden_en_dia: number
          repeticiones?: string | null
          rutina_id: string
          series?: number | null
          url_video?: string | null
        }
        Update: {
          creado_en?: string | null
          descanso_segundos?: number | null
          dia_numero?: number
          equipamiento?: string[] | null
          grupo_muscular?: string | null
          id?: string
          instrucciones?: string | null
          nombre?: string
          orden_en_dia?: number
          repeticiones?: string | null
          rutina_id?: string
          series?: number | null
          url_video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_routine_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "rutinas"
            referencedColumns: ["id"]
          },
        ]
      }
      ejercicios_equipamiento: {
        Row: {
          alternativa_id: string | null
          creado_en: string | null
          ejercicio_id: string
          equipamiento_id: string
          es_opcional: boolean | null
          id: string
        }
        Insert: {
          alternativa_id?: string | null
          creado_en?: string | null
          ejercicio_id: string
          equipamiento_id: string
          es_opcional?: boolean | null
          id?: string
        }
        Update: {
          alternativa_id?: string | null
          creado_en?: string | null
          ejercicio_id?: string
          equipamiento_id?: string
          es_opcional?: boolean | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ejercicios_equipamiento_alternativa_id_fkey"
            columns: ["alternativa_id"]
            isOneToOne: false
            referencedRelation: "equipamiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejercicios_equipamiento_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejercicios_equipamiento_equipamiento_id_fkey"
            columns: ["equipamiento_id"]
            isOneToOne: false
            referencedRelation: "equipamiento"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamiento: {
        Row: {
          actualizado_en: string | null
          categoria: string | null
          creado_en: string | null
          esta_disponible: boolean | null
          estado: string | null
          id: string
          nombre: string
          ultimo_mantenimiento: string | null
        }
        Insert: {
          actualizado_en?: string | null
          categoria?: string | null
          creado_en?: string | null
          esta_disponible?: boolean | null
          estado?: string | null
          id?: string
          nombre: string
          ultimo_mantenimiento?: string | null
        }
        Update: {
          actualizado_en?: string | null
          categoria?: string | null
          creado_en?: string | null
          esta_disponible?: boolean | null
          estado?: string | null
          id?: string
          nombre?: string
          ultimo_mantenimiento?: string | null
        }
        Relationships: []
      }
      gamificacion_del_usuario: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          fecha_ultima_actividad: string | null
          nivel: number | null
          puntos: number | null
          racha_actual: number | null
          racha_mas_larga: number | null
          usuario_id: string
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          fecha_ultima_actividad?: string | null
          nivel?: number | null
          puntos?: number | null
          racha_actual?: number | null
          racha_mas_larga?: number | null
          usuario_id: string
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          fecha_ultima_actividad?: string | null
          nivel?: number | null
          puntos?: number | null
          racha_actual?: number | null
          racha_mas_larga?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gamification_user_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gimnasios: {
        Row: {
          actualizado_en: string | null
          color_primario: string | null
          color_secundario: string | null
          configuracion: Json | null
          config_visual: Json | null
          creado_en: string | null
          cuota_ia_mensual: number | null
          cuota_ia_usada: number | null
          descuento_saas: number | null
          es_activo: boolean | null
          estado_pago_saas: string | null
          fase_onboarding: string | null
          favicon_url: string | null
          fecha_proximo_pago: string | null
          id: string
          logo_url: string | null
          modulos_activos: Json | null
          nombre: string
          plan_id: string | null
          scoring_salud: number | null
          slug: string
        }
        Insert: {
          actualizado_en?: string | null
          color_primario?: string | null
          color_secundario?: string | null
          configuracion?: Json | null
          config_visual?: Json | null
          creado_en?: string | null
          cuota_ia_mensual?: number | null
          cuota_ia_usada?: number | null
          descuento_saas?: number | null
          es_activo?: boolean | null
          estado_pago_saas?: string | null
          fase_onboarding?: string | null
          favicon_url?: string | null
          fecha_proximo_pago?: string | null
          id?: string
          logo_url?: string | null
          modulos_activos?: Json | null
          nombre: string
          plan_id?: string | null
          scoring_salud?: number | null
          slug: string
        }
        Update: {
          actualizado_en?: string | null
          color_primario?: string | null
          color_secundario?: string | null
          configuracion?: Json | null
          config_visual?: Json | null
          creado_en?: string | null
          cuota_ia_mensual?: number | null
          cuota_ia_usada?: number | null
          descuento_saas?: number | null
          es_activo?: boolean | null
          estado_pago_saas?: string | null
          fase_onboarding?: string | null
          favicon_url?: string | null
          fecha_proximo_pago?: string | null
          id?: string
          logo_url?: string | null
          modulos_activos?: Json | null
          nombre?: string
          plan_id?: string | null
          scoring_salud?: number | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "gimnasios_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes_suscripcion"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_cambios_perfil: {
        Row: {
          changed_by: string | null
          created_at: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          profile_id: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_change_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_change_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_engagement: {
        Row: {
          fecha_evento: string | null
          id: string
          metadatos: Json | null
          tipo_evento: string
          usuario_id: string
        }
        Insert: {
          fecha_evento?: string | null
          id?: string
          metadatos?: Json | null
          tipo_evento: string
          usuario_id: string
        }
        Update: {
          fecha_evento?: string | null
          id?: string
          metadatos?: Json | null
          tipo_evento?: string
          usuario_id?: string
        }
        Relationships: []
      }
      historial_notificaciones: {
        Row: {
          creado_en: string | null
          cuerpo: string
          datos: Json | null
          enviada: boolean | null
          enviada_en: string | null
          error: string | null
          id: string
          tipo: string
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          creado_en?: string | null
          cuerpo: string
          datos?: Json | null
          enviada?: boolean | null
          enviada_en?: string | null
          error?: string | null
          id?: string
          tipo: string
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          creado_en?: string | null
          cuerpo?: string
          datos?: Json | null
          enviada?: boolean | null
          enviada_en?: string | null
          error?: string | null
          id?: string
          tipo?: string
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios_de_clase: {
        Row: {
          actividad_id: string | null
          capacidad_actual: number | null
          capacidad_maxima: number | null
          creado_en: string | null
          dia_de_la_semana: number
          entrenador_id: string | null
          esta_activa: boolean | null
          hora_fin: string
          hora_inicio: string
          id: string
          notas_entrenador: string | null
          profesor_texto: string | null
        }
        Insert: {
          actividad_id?: string | null
          capacidad_actual?: number | null
          capacidad_maxima?: number | null
          creado_en?: string | null
          dia_de_la_semana: number
          entrenador_id?: string | null
          esta_activa?: boolean | null
          hora_fin: string
          hora_inicio: string
          id?: string
          notas_entrenador?: string | null
          profesor_texto?: string | null
        }
        Update: {
          actividad_id?: string | null
          capacidad_actual?: number | null
          capacidad_maxima?: number | null
          creado_en?: string | null
          dia_de_la_semana?: number
          entrenador_id?: string | null
          esta_activa?: boolean | null
          hora_fin?: string
          hora_inicio?: string
          id?: string
          notas_entrenador?: string | null
          profesor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_activity_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_coach_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logros: {
        Row: {
          categoria: string | null
          created_at: string | null
          descripcion: string | null
          icon: string | null
          id: string
          nombre: string
          puntos_recompensa: number | null
          tipo_condicion: string | null
          valor_condicion: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          icon?: string | null
          id?: string
          nombre: string
          puntos_recompensa?: number | null
          tipo_condicion?: string | null
          valor_condicion?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          icon?: string | null
          id?: string
          nombre?: string
          puntos_recompensa?: number | null
          tipo_condicion?: string | null
          valor_condicion?: number | null
        }
        Relationships: []
      }
      logros_del_usuario: {
        Row: {
          desbloqueado_en: string | null
          id: string
          logro_id: string | null
          user_id: string | null
        }
        Insert: {
          desbloqueado_en?: string | null
          id?: string
          logro_id?: string | null
          user_id?: string | null
        }
        Update: {
          desbloqueado_en?: string | null
          id?: string
          logro_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["logro_id"]
            isOneToOne: false
            referencedRelation: "logros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_acceso_remoto: {
        Row: {
          fecha: string | null
          gimnasio_id: string | null
          id: string
          motivo: string | null
          superadmin_id: string | null
        }
        Insert: {
          fecha?: string | null
          gimnasio_id?: string | null
          id?: string
          motivo?: string | null
          superadmin_id?: string | null
        }
        Update: {
          fecha?: string | null
          gimnasio_id?: string | null
          id?: string
          motivo?: string | null
          superadmin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_acceso_remoto_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_acceso_remoto_superadmin_id_fkey"
            columns: ["superadmin_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mediciones: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          grasa_corporal: number | null
          id: string
          masa_muscular: number | null
          notas: string | null
          peso: number | null
          registrado_en: string | null
          user_id: string
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          grasa_corporal?: number | null
          id?: string
          masa_muscular?: number | null
          notas?: string | null
          peso?: number | null
          registrado_en?: string | null
          user_id: string
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          grasa_corporal?: number | null
          id?: string
          masa_muscular?: number | null
          notas?: string | null
          peso?: number | null
          registrado_en?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes: {
        Row: {
          actualizado_en: string | null
          contenido: string
          conversacion_id: string | null
          creado_en: string | null
          esta_leido: boolean | null
          id: string
          receptor_id: string
          remitente_id: string
        }
        Insert: {
          actualizado_en?: string | null
          contenido: string
          conversacion_id?: string | null
          creado_en?: string | null
          esta_leido?: boolean | null
          id?: string
          receptor_id: string
          remitente_id: string
        }
        Update: {
          actualizado_en?: string | null
          contenido?: string
          conversacion_id?: string | null
          creado_en?: string | null
          esta_leido?: boolean | null
          id?: string
          receptor_id?: string
          remitente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_conversation_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receptor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["remitente_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_cuenta: {
        Row: {
          concepto: string
          creado_en: string
          cuenta_id: string
          id: string
          monto: number
          registrado_por: string | null
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_cuenta"]
        }
        Insert: {
          concepto: string
          creado_en?: string
          cuenta_id: string
          id?: string
          monto: number
          registrado_por?: string | null
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_cuenta"]
        }
        Update: {
          concepto?: string
          creado_en?: string
          cuenta_id?: string
          id?: string
          monto?: number
          registrado_por?: string | null
          tipo_movimiento?: Database["public"]["Enums"]["tipo_movimiento_cuenta"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_cuenta_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_corrientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_cuenta_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones_preferencias: {
        Row: {
          clases_recordatorio: boolean | null
          logros_nuevos: boolean | null
          mensajes_nuevos: boolean | null
          pagos_confirmacion: boolean | null
          rutinas_nuevas: boolean | null
          sistema: boolean | null
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          clases_recordatorio?: boolean | null
          logros_nuevos?: boolean | null
          mensajes_nuevos?: boolean | null
          pagos_confirmacion?: boolean | null
          rutinas_nuevas?: boolean | null
          sistema?: boolean | null
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          clases_recordatorio?: boolean | null
          logros_nuevos?: boolean | null
          mensajes_nuevos?: boolean | null
          pagos_confirmacion?: boolean | null
          rutinas_nuevas?: boolean | null
          sistema?: boolean | null
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_preferencias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      objetivos_del_usuario: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          esta_activo: boolean | null
          id: string
          notas_entrenador: string | null
          objetivo_principal: string | null
          peso_objetivo: number | null
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          esta_activo?: boolean | null
          id?: string
          notas_entrenador?: string | null
          objetivo_principal?: string | null
          peso_objetivo?: number | null
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          esta_activo?: boolean | null
          id?: string
          notas_entrenador?: string | null
          objetivo_principal?: string | null
          peso_objetivo?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_user_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          actualizado_en: string | null
          aprobado_en: string | null
          aprobado_por: string | null
          concepto: string
          conteo_prorrogas: number | null
          creado_en: string | null
          es_prorroga: boolean | null
          estado: string
          fecha_vencimiento: string | null
          fecha_vencimiento_original: string | null
          gimnasio_id: string | null
          id: string
          id_pago_proveedor: string | null
          metadatos: Json | null
          metodo_pago: string
          moneda: string | null
          monto: number
          notas: string | null
          proveedor_pago: string | null
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string | null
          aprobado_en?: string | null
          aprobado_por?: string | null
          concepto: string
          conteo_prorrogas?: number | null
          creado_en?: string | null
          es_prorroga?: boolean | null
          estado?: string
          fecha_vencimiento?: string | null
          fecha_vencimiento_original?: string | null
          gimnasio_id?: string | null
          id?: string
          id_pago_proveedor?: string | null
          metadatos?: Json | null
          metodo_pago: string
          moneda?: string | null
          monto: number
          notas?: string | null
          proveedor_pago?: string | null
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string | null
          aprobado_en?: string | null
          aprobado_por?: string | null
          concepto?: string
          conteo_prorrogas?: number | null
          creado_en?: string | null
          es_prorroga?: boolean | null
          estado?: string
          fecha_vencimiento?: string | null
          fecha_vencimiento_original?: string | null
          gimnasio_id?: string | null
          id?: string
          id_pago_proveedor?: string | null
          metadatos?: Json | null
          metodo_pago?: string
          moneda?: string | null
          monto?: number
          notas?: string | null
          proveedor_pago?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_approved_by_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes_conversacion: {
        Row: {
          conversation_id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participantes_conversacion_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participantes_conversacion_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes_desafio: {
        Row: {
          challenge_id: string | null
          current_score: string | null
          id: string
          joined_at: string | null
          proof_url: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          current_score?: string | null
          id?: string
          joined_at?: string | null
          proof_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          current_score?: string | null
          id?: string
          joined_at?: string | null
          proof_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "desafios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          actualizado_en: string | null
          apellido: string | null
          ciudad: string | null
          contacto_emergencia: Json | null
          correo: string
          creado_en: string | null
          direccion: string | null
          dni: string | null
          es_pago_agrupado_con: string | null
          estado_membresia:
            | Database["public"]["Enums"]["membership_status_enum"]
            | null
          exencion_aceptada: boolean | null
          fecha_exencion: string | null
          fecha_fin_membresia: string | null
          fecha_firma_parq: string | null
          fecha_inicio_membresia: string | null
          fecha_nacimiento: string | null
          gender: string | null
          gimnasio_id: string | null
          id: string
          informacion_medica: Json | null
          modificaciones_recomendadas: string | null
          nombre: string | null
          nombre_completo: string | null
          observaciones_entrenador: string | null
          onboarding_completado: boolean | null
          onboarding_completado_en: string | null
          parq_firmado: boolean | null
          plan_id: string | null
          restricciones_adicionales: string | null
          rol: Database["public"]["Enums"]["user_role"]
          sucursal_id: string | null
          telefono: string | null
          url_avatar: string | null
        }
        Insert: {
          actualizado_en?: string | null
          apellido?: string | null
          ciudad?: string | null
          contacto_emergencia?: Json | null
          correo: string
          creado_en?: string | null
          direccion?: string | null
          dni?: string | null
          es_pago_agrupado_con?: string | null
          estado_membresia?:
            | Database["public"]["Enums"]["membership_status_enum"]
            | null
          exencion_aceptada?: boolean | null
          fecha_exencion?: string | null
          fecha_fin_membresia?: string | null
          fecha_firma_parq?: string | null
          fecha_inicio_membresia?: string | null
          fecha_nacimiento?: string | null
          gender?: string | null
          gimnasio_id?: string | null
          id: string
          informacion_medica?: Json | null
          modificaciones_recomendadas?: string | null
          nombre?: string | null
          nombre_completo?: string | null
          observaciones_entrenador?: string | null
          onboarding_completado?: boolean | null
          onboarding_completado_en?: string | null
          parq_firmado?: boolean | null
          plan_id?: string | null
          restricciones_adicionales?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          sucursal_id?: string | null
          telefono?: string | null
          url_avatar?: string | null
        }
        Update: {
          actualizado_en?: string | null
          apellido?: string | null
          ciudad?: string | null
          contacto_emergencia?: Json | null
          correo?: string
          creado_en?: string | null
          direccion?: string | null
          dni?: string | null
          es_pago_agrupado_con?: string | null
          estado_membresia?:
            | Database["public"]["Enums"]["membership_status_enum"]
            | null
          exencion_aceptada?: boolean | null
          fecha_exencion?: string | null
          fecha_fin_membresia?: string | null
          fecha_firma_parq?: string | null
          fecha_inicio_membresia?: string | null
          fecha_nacimiento?: string | null
          gender?: string | null
          gimnasio_id?: string | null
          id?: string
          informacion_medica?: Json | null
          modificaciones_recomendadas?: string | null
          nombre?: string | null
          nombre_completo?: string | null
          observaciones_entrenador?: string | null
          onboarding_completado?: boolean | null
          onboarding_completado_en?: string | null
          parq_firmado?: boolean | null
          plan_id?: string | null
          restricciones_adicionales?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          sucursal_id?: string | null
          telefono?: string | null
          url_avatar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_es_pago_agrupado_con_fkey"
            columns: ["es_pago_agrupado_con"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes_gimnasio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_gimnasio: {
        Row: {
          actualizado_en: string | null
          beneficios: Json | null
          creado_en: string | null
          descripcion: string | null
          duracion_meses: number
          esta_activo: boolean | null
          gimnasio_id: string
          id: string
          nombre: string
          precio: number
        }
        Insert: {
          actualizado_en?: string | null
          beneficios?: Json | null
          creado_en?: string | null
          descripcion?: string | null
          duracion_meses?: number
          esta_activo?: boolean | null
          gimnasio_id: string
          id?: string
          nombre: string
          precio: number
        }
        Update: {
          actualizado_en?: string | null
          beneficios?: Json | null
          creado_en?: string | null
          descripcion?: string | null
          duracion_meses?: number
          esta_activo?: boolean | null
          gimnasio_id?: string
          id?: string
          nombre?: string
          precio?: number
        }
        Relationships: [
          {
            foreignKeyName: "planes_gimnasio_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_nutricionales: {
        Row: {
          actualizado_en: string | null
          calorias_diarias: number | null
          comidas: Json | null
          creado_en: string | null
          entrenador_id: string | null
          esta_activo: boolean | null
          gramos_carbohidratos: number | null
          gramos_grasas: number | null
          gramos_proteina: number | null
          id: string
          rutina_id: string | null
          suplementos: Json | null
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string | null
          calorias_diarias?: number | null
          comidas?: Json | null
          creado_en?: string | null
          entrenador_id?: string | null
          esta_activo?: boolean | null
          gramos_carbohidratos?: number | null
          gramos_grasas?: number | null
          gramos_proteina?: number | null
          id?: string
          rutina_id?: string | null
          suplementos?: Json | null
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string | null
          calorias_diarias?: number | null
          comidas?: Json | null
          creado_en?: string | null
          entrenador_id?: string | null
          esta_activo?: boolean | null
          gramos_carbohidratos?: number | null
          gramos_grasas?: number | null
          gramos_proteina?: number | null
          id?: string
          rutina_id?: string | null
          suplementos?: Json | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plans_coach_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_plans_user_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planes_nutricionales_rutina_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "rutinas"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_suscripcion: {
        Row: {
          caracteristicas: Json | null
          creado_en: string | null
          id: string
          limite_sucursales: number | null
          limite_usuarios: number | null
          nombre: string
          precio_mensual: number
        }
        Insert: {
          caracteristicas?: Json | null
          creado_en?: string | null
          id?: string
          limite_sucursales?: number | null
          limite_usuarios?: number | null
          nombre: string
          precio_mensual: number
        }
        Update: {
          caracteristicas?: Json | null
          creado_en?: string | null
          id?: string
          limite_sucursales?: number | null
          limite_usuarios?: number | null
          nombre?: string
          precio_mensual?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          usuario_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          usuario_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_asistencias: {
        Row: {
          alumno_id: string
          estado_membresia_momento: string | null
          fecha_hora: string
          gimnasio_id: string
          id: string
          metodo_ingreso: Database["public"]["Enums"]["metodo_ingreso_asistencia"]
          registrado_por: string | null
        }
        Insert: {
          alumno_id: string
          estado_membresia_momento?: string | null
          fecha_hora?: string
          gimnasio_id: string
          id?: string
          metodo_ingreso: Database["public"]["Enums"]["metodo_ingreso_asistencia"]
          registrado_por?: string | null
        }
        Update: {
          alumno_id?: string
          estado_membresia_momento?: string | null
          fecha_hora?: string
          gimnasio_id?: string
          id?: string
          metodo_ingreso?: Database["public"]["Enums"]["metodo_ingreso_asistencia"]
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_asistencias_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_asistencias_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_asistencias_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_acceso_rutina: {
        Row: {
          action: string
          created_at: string | null
          device_info: Json | null
          id: string
          ip_address: unknown
          latitude: number | null
          longitude: number | null
          routine_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          latitude?: number | null
          longitude?: number | null
          routine_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          latitude?: number | null
          longitude?: number | null
          routine_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_access_logs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "rutinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_de_ejercicio: {
        Row: {
          creado_en: string | null
          ejercicio_id: string
          fue_completado: boolean | null
          id: string
          peso_real: number | null
          puntuacion_dificultad: number | null
          repeticiones_reales: string | null
          segundos_descanso_real: number | null
          series_reales: number | null
          sesion_id: string
        }
        Insert: {
          creado_en?: string | null
          ejercicio_id: string
          fue_completado?: boolean | null
          id?: string
          peso_real?: number | null
          puntuacion_dificultad?: number | null
          repeticiones_reales?: string | null
          segundos_descanso_real?: number | null
          series_reales?: number | null
          sesion_id: string
        }
        Update: {
          creado_en?: string | null
          ejercicio_id?: string
          fue_completado?: boolean | null
          id?: string
          peso_real?: number | null
          puntuacion_dificultad?: number | null
          repeticiones_reales?: string | null
          segundos_descanso_real?: number | null
          series_reales?: number | null
          sesion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_performance_logs_exercise_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_performance_logs_session_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones_de_entrenamiento"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_nutricion: {
        Row: {
          actualizado_en: string
          calorias_estimadas: number | null
          creado_en: string
          id: string
          ingredientes_detectados: string[] | null
          macros: Json | null
          nombre_comida: string
          puntuacion_salud: number | null
          recomendacion_tactica: string | null
          url_imagen: string | null
          usuario_id: string
        }
        Insert: {
          actualizado_en?: string
          calorias_estimadas?: number | null
          creado_en?: string
          id?: string
          ingredientes_detectados?: string[] | null
          macros?: Json | null
          nombre_comida: string
          puntuacion_salud?: number | null
          recomendacion_tactica?: string | null
          url_imagen?: string | null
          usuario_id: string
        }
        Update: {
          actualizado_en?: string
          calorias_estimadas?: number | null
          creado_en?: string
          id?: string
          ingredientes_detectados?: string[] | null
          macros?: Json | null
          nombre_comida?: string
          puntuacion_salud?: number | null
          recomendacion_tactica?: string | null
          url_imagen?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_nutricion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_recuperacion: {
        Row: {
          calidad_sueno: number | null
          creado_en: string
          fecha: string
          horas_sueno: number | null
          id: string
          nivel_estres: number | null
          nivel_fatiga: number | null
          notas: string | null
          usuario_id: string
        }
        Insert: {
          calidad_sueno?: number | null
          creado_en?: string
          fecha?: string
          horas_sueno?: number | null
          id?: string
          nivel_estres?: number | null
          nivel_fatiga?: number | null
          notas?: string | null
          usuario_id: string
        }
        Update: {
          calidad_sueno?: number | null
          creado_en?: string
          fecha?: string
          horas_sueno?: number | null
          id?: string
          nivel_estres?: number | null
          nivel_fatiga?: number | null
          notas?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_recuperacion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      relacion_alumno_coach: {
        Row: {
          asignado_en: string | null
          entrenador_id: string | null
          es_principal: boolean | null
          esta_activo: boolean | null
          id: string
          usuario_id: string
        }
        Insert: {
          asignado_en?: string | null
          entrenador_id?: string | null
          es_principal?: boolean | null
          esta_activo?: boolean | null
          id?: string
          usuario_id: string
        }
        Update: {
          asignado_en?: string | null
          entrenador_id?: string | null
          es_principal?: boolean | null
          esta_activo?: boolean | null
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_coaches_coach_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_coaches_user_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reportes_de_alumnos: {
        Row: {
          created_at: string | null
          descripcion: string | null
          estado: string | null
          id: string
          resuelto_en: string | null
          resuelto_por: string | null
          titulo: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          id?: string
          resuelto_en?: string | null
          resuelto_por?: string | null
          titulo: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          id?: string
          resuelto_en?: string | null
          resuelto_por?: string | null
          titulo?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_reports_resolved_by_fkey"
            columns: ["resuelto_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas_de_clase: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          estado: string
          fecha: string
          horario_clase_id: string | null
          id: string
          usuario_id: string | null
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          estado?: string
          fecha: string
          horario_clase_id?: string | null
          id?: string
          usuario_id?: string | null
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          estado?: string
          fecha?: string
          horario_clase_id?: string | null
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["horario_clase_id"]
            isOneToOne: false
            referencedRelation: "classes_with_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["horario_clase_id"]
            isOneToOne: false
            referencedRelation: "horarios_de_clase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rutinas: {
        Row: {
          actualizado_en: string | null
          aprobado_en: string | null
          aprobado_por: string | null
          consideraciones_medicas: string | null
          contador_vistas: number | null
          creado_en: string | null
          duracion_semanas: number | null
          entrenador_id: string | null
          equipamiento_usado: string[] | null
          esta_activa: boolean | null
          estado: string | null
          generado_por_ia: boolean | null
          id: string
          nombre: string
          objetivo: string | null
          objetivo_usuario_id: string | null
          plan_nutricional_id: string | null
          prompt_ia: string | null
          ultima_vista_en: string | null
          usuario_id: string
        }
        Insert: {
          actualizado_en?: string | null
          aprobado_en?: string | null
          aprobado_por?: string | null
          consideraciones_medicas?: string | null
          contador_vistas?: number | null
          creado_en?: string | null
          duracion_semanas?: number | null
          entrenador_id?: string | null
          equipamiento_usado?: string[] | null
          esta_activa?: boolean | null
          estado?: string | null
          generado_por_ia?: boolean | null
          id?: string
          nombre: string
          objetivo?: string | null
          objetivo_usuario_id?: string | null
          plan_nutricional_id?: string | null
          prompt_ia?: string | null
          ultima_vista_en?: string | null
          usuario_id: string
        }
        Update: {
          actualizado_en?: string | null
          aprobado_en?: string | null
          aprobado_por?: string | null
          consideraciones_medicas?: string | null
          contador_vistas?: number | null
          creado_en?: string | null
          duracion_semanas?: number | null
          entrenador_id?: string | null
          equipamiento_usado?: string[] | null
          esta_activa?: boolean | null
          estado?: string | null
          generado_por_ia?: boolean | null
          id?: string
          nombre?: string
          objetivo?: string | null
          objetivo_usuario_id?: string | null
          plan_nutricional_id?: string | null
          prompt_ia?: string | null
          ultima_vista_en?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_approved_by_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_coach_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_nutrition_plan_id_fkey"
            columns: ["plan_nutricional_id"]
            isOneToOne: false
            referencedRelation: "planes_nutricionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_user_goal_id_fkey"
            columns: ["objetivo_usuario_id"]
            isOneToOne: false
            referencedRelation: "objetivos_del_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_user_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_auditoria_ia: {
        Row: {
          creado_en: string | null
          gimnasio_id: string | null
          id: string
          tipo_generacion: string | null
          tokens_estimados: number | null
          usuario_id: string | null
        }
        Insert: {
          creado_en?: string | null
          gimnasio_id?: string | null
          id?: string
          tipo_generacion?: string | null
          tokens_estimados?: number | null
          usuario_id?: string | null
        }
        Update: {
          creado_en?: string | null
          gimnasio_id?: string | null
          id?: string
          tipo_generacion?: string | null
          tokens_estimados?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_auditoria_ia_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_metrics: {
        Row: {
          alumnos_activos_hoy: number | null
          churn_gyms_mes: number | null
          creado_en: string | null
          fecha: string
          gyms_activos: number | null
          id: string
          ingresos_totales_mes: number | null
          mrr: number | null
          rutinas_ia_hoy: number | null
          total_alumnos: number | null
          videos_procesados_hoy: number | null
        }
        Insert: {
          alumnos_activos_hoy?: number | null
          churn_gyms_mes?: number | null
          creado_en?: string | null
          fecha?: string
          gyms_activos?: number | null
          id?: string
          ingresos_totales_mes?: number | null
          mrr?: number | null
          rutinas_ia_hoy?: number | null
          total_alumnos?: number | null
          videos_procesados_hoy?: number | null
        }
        Update: {
          alumnos_activos_hoy?: number | null
          churn_gyms_mes?: number | null
          creado_en?: string | null
          fecha?: string
          gyms_activos?: number | null
          id?: string
          ingresos_totales_mes?: number | null
          mrr?: number | null
          rutinas_ia_hoy?: number | null
          total_alumnos?: number | null
          videos_procesados_hoy?: number | null
        }
        Relationships: []
      }
      saas_pagos_historial: {
        Row: {
          creado_en: string | null
          estado: string | null
          fecha_pago: string | null
          gimnasio_id: string | null
          id: string
          metadata: Json | null
          moneda: string | null
          monto: number
          periodo_fin: string | null
          periodo_inicio: string | null
          referencia_externa: string | null
          tipo_pago: string | null
        }
        Insert: {
          creado_en?: string | null
          estado?: string | null
          fecha_pago?: string | null
          gimnasio_id?: string | null
          id?: string
          metadata?: Json | null
          moneda?: string | null
          monto: number
          periodo_fin?: string | null
          periodo_inicio?: string | null
          referencia_externa?: string | null
          tipo_pago?: string | null
        }
        Update: {
          creado_en?: string | null
          estado?: string | null
          fecha_pago?: string | null
          gimnasio_id?: string | null
          id?: string
          metadata?: Json | null
          moneda?: string | null
          monto?: number
          periodo_fin?: string | null
          periodo_inicio?: string | null
          referencia_externa?: string | null
          tipo_pago?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_pagos_historial_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_de_entrenamiento: {
        Row: {
          creado_en: string | null
          estado: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          notas: string | null
          puntos_totales: number | null
          puntuacion_animo: number | null
          rutina_id: string
          usuario_id: string
        }
        Insert: {
          creado_en?: string | null
          estado?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          notas?: string | null
          puntos_totales?: number | null
          puntuacion_animo?: number | null
          rutina_id: string
          usuario_id: string
        }
        Update: {
          creado_en?: string | null
          estado?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          notas?: string | null
          puntos_totales?: number | null
          puntuacion_animo?: number | null
          rutina_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "rutinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          actualizado_en: string | null
          configuracion: Json | null
          creado_en: string | null
          direccion: string | null
          gimnasio_id: string | null
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string | null
          configuracion?: Json | null
          creado_en?: string | null
          direccion?: string | null
          gimnasio_id?: string | null
          id?: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string | null
          configuracion?: Json | null
          creado_en?: string | null
          direccion?: string | null
          gimnasio_id?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_gimnasio_id_fkey"
            columns: ["gimnasio_id"]
            isOneToOne: false
            referencedRelation: "gimnasios"
            referencedColumns: ["id"]
          },
        ]
      }
      videos_ejercicio: {
        Row: {
          actualizado_en: string | null
          calificacion_alumno: number | null
          compartido_con_alumno: boolean | null
          compartido_en: string | null
          correcciones_ia: Json | null
          creado_en: string | null
          duracion_segundos: number | null
          ejercicio_id: string | null
          estado: string | null
          feedback_alumno: string | null
          id: string
          procesado_en: string | null
          puntaje_confianza: number | null
          subido_por: string
          url_thumbnail: string | null
          url_video: string
          usuario_id: string
          visto_por_alumno: boolean | null
        }
        Insert: {
          actualizado_en?: string | null
          calificacion_alumno?: number | null
          compartido_con_alumno?: boolean | null
          compartido_en?: string | null
          correcciones_ia?: Json | null
          creado_en?: string | null
          duracion_segundos?: number | null
          ejercicio_id?: string | null
          estado?: string | null
          feedback_alumno?: string | null
          id?: string
          procesado_en?: string | null
          puntaje_confianza?: number | null
          subido_por: string
          url_thumbnail?: string | null
          url_video: string
          usuario_id: string
          visto_por_alumno?: boolean | null
        }
        Update: {
          actualizado_en?: string | null
          calificacion_alumno?: number | null
          compartido_con_alumno?: boolean | null
          compartido_en?: string | null
          correcciones_ia?: Json | null
          creado_en?: string | null
          duracion_segundos?: number | null
          ejercicio_id?: string | null
          estado?: string | null
          feedback_alumno?: string | null
          id?: string
          procesado_en?: string | null
          puntaje_confianza?: number | null
          subido_por?: string
          url_thumbnail?: string | null
          url_video?: string
          usuario_id?: string
          visto_por_alumno?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_ejercicio_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_ejercicio_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_ejercicio_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      saas_mrr_actual: {
        Row: {
          mrr: number | null
        }
        Relationships: []
      }
      classes_with_availability: {
        Row: {
          activity_color: string | null
          activity_id: string | null
          activity_image: string | null
          activity_name: string | null
          booked_count: number | null
          coach_id: string | null
          coach_name: string | null
          created_at: string | null
          current_capacity: number | null
          day_of_week: number | null
          end_time: string | null
          id: string | null
          is_active: boolean | null
          max_capacity: number | null
          notes: string | null
          start_time: string | null
          teacher_text: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookings_detailed: {
        Row: {
          activity_image: string | null
          activity_name: string | null
          class_schedule_id: string | null
          coach_name: string | null
          created_at: string | null
          date: string | null
          day_of_week: number | null
          end_time: string | null
          id: string | null
          start_time: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "classes_with_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "horarios_de_clase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_ai_quota: { Args: { gym_id: string }; Returns: boolean }
      consume_ai_quota: {
        Args: { p_gym_id: string; p_type: string; p_user_id: string }
        Returns: Json
      }
      increment_points: {
        Args: { points_param: number; user_id_param: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      migrate_existing_users: { Args: never; Returns: number }
    }
    Enums: {
      estado_cuenta_corriente: "al_dia" | "con_deuda" | "suspendida"
      estado_pago: "pendiente" | "aprobado" | "rechazado" | "reembolsado"
      membership_status_enum: "active" | "inactive" | "suspended" | "expired"
      metodo_ingreso_asistencia: "qr_app" | "manual_recepcion"
      metodo_pago: "efectivo" | "tarjeta" | "transferencia" | "mercadopago"
      tipo_movimiento_cuenta: "cargo" | "abono"
      user_role:
        | "admin"
        | "coach"
        | "member"
        | "superadmin"
        | "alumno"
        | "recepcion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_cuenta_corriente: ["al_dia", "con_deuda", "suspendida"],
      estado_pago: ["pendiente", "aprobado", "rechazado", "reembolsado"],
      membership_status_enum: ["active", "inactive", "suspended", "expired"],
      metodo_ingreso_asistencia: ["qr_app", "manual_recepcion"],
      metodo_pago: ["efectivo", "tarjeta", "transferencia", "mercadopago"],
      tipo_movimiento_cuenta: ["cargo", "abono"],
      user_role: [
        "admin",
        "coach",
        "member",
        "superadmin",
        "alumno",
        "recepcion",
      ],
    },
  },
} as const
