# 🚀 Guía de Configuración de Producción

## Variables de Entorno Requeridas

Agregar al archivo `.env.local`:

```bash
# ============================================
# FIREBASE (Client-side)
# ============================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=virtud-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=virtud-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=virtud-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:xxxxx
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ============================================
# GEMINI AI (Server-side)
# ============================================
GEMINI_API_KEY=AIzaSy...

# ============================================
# JWT AUTHENTICATION
# ============================================
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=tu-secret-super-seguro-de-64-caracteres-minimo

# ============================================
# SENTRY ERROR TRACKING
# ============================================
# Obtener de: https://sentry.io/settings/projects/
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# ============================================
# GOOGLE ANALYTICS
# ============================================
# Obtener de: https://analytics.google.com/
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# ============================================
# MERCADOPAGO (Opcional)
# ============================================
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxx
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx

# ============================================
# OTROS
# ============================================
NEXT_PUBLIC_SITE_URL=https://virtud.com
NEXT_PUBLIC_ADMIN_OWNER_EMAIL=admin@virtud.com
```

---

## 📋 Checklist de Configuración

### 1. JWT Secret (CRÍTICO)
```bash
# Generar secret seguro
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copiar el resultado a .env.local
JWT_SECRET=resultado_aqui
```

### 2. Sentry Setup
```bash
# 1. Crear cuenta en https://sentry.io
# 2. Crear nuevo proyecto Next.js
# 3. Copiar DSN
# 4. Agregar a .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### 3. Google Analytics Setup
```bash
# 1. Crear cuenta en https://analytics.google.com
# 2. Crear nueva propiedad GA4
# 3. Copiar Measurement ID (G-XXXXXXXXXX)
# 4. Agregar a .env.local
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 4. Firebase Admin (Para Migración)
```bash
# 1. Ir a Firebase Console → Project Settings → Service Accounts
# 2. Generate New Private Key
# 3. Descargar JSON
# 4. Guardar como serviceAccountKey.json
# 5. Configurar variable de entorno:
export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
```

---

## 🔄 Migración de Firestore

### Ejecutar Migración
```bash
# 1. Configurar credenciales
export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"

# 2. Ejecutar script
cd frontend
node scripts/migrate-mock-data.js

# Output esperado:
# 🚀 Iniciando migración de estudiantes...
# ✅ Migrado: Juan Pérez (student_1)
# ✅ Migrado: María González (student_2)
# ✅ Migrado: Carlos Ruiz (student_3)
# 🎉 Migración completada: 3/3 estudiantes
```

### Verificar Migración
```bash
# En Firebase Console:
# 1. Ir a Firestore Database
# 2. Verificar collection 'usuarios'
# 3. Confirmar que hay 3 documentos
```

---

## 🔐 GitHub Secrets (Para CI/CD)

### Configurar en GitHub
```
1. Ir a: GitHub Repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Agregar cada uno:
```

**Secrets Requeridos:**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
GEMINI_API_KEY
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_SENTRY_DSN
NEXT_PUBLIC_GA_ID
JWT_SECRET
```

### Obtener Vercel Tokens
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
cd frontend
vercel link

# 4. Obtener tokens
vercel env pull .env.vercel

# Los valores están en .vercel/project.json:
# - VERCEL_ORG_ID
# - VERCEL_PROJECT_ID

# Token de Vercel:
# Ir a: https://vercel.com/account/tokens
# Create Token → Copiar
```

---

## ✅ Testing de Configuración

### Test 1: Sentry
```bash
# 1. Agregar error intencional en cualquier componente:
throw new Error('Test Sentry');

# 2. Visitar la página
# 3. Verificar en Sentry dashboard que apareció el error
# 4. Remover el error de prueba
```

### Test 2: Google Analytics
```bash
# 1. Abrir DevTools → Network
# 2. Filtrar por 'google-analytics'
# 3. Navegar por el sitio
# 4. Verificar que se envían eventos
# 5. Verificar en GA dashboard (puede tardar 24-48h)
```

### Test 3: JWT
```bash
# 1. Login en la app
# 2. Verificar cookie 'auth-token' en DevTools
# 3. Copiar token
# 4. Decodificar en https://jwt.io
# 5. Verificar que tiene firma válida
```

---

## 📊 Monitoreo Post-Deployment

### Sentry Dashboard
- Errores en tiempo real
- Stack traces completos
- User context
- Performance monitoring

### Google Analytics
- Usuarios activos
- Páginas más visitadas
- Eventos custom (bookings, routines, etc.)
- Conversiones

### Vercel Analytics (Opcional)
```bash
# Habilitar en Vercel Dashboard
# Automáticamente trackea:
# - Core Web Vitals
# - Real User Monitoring
# - Performance metrics
```

---

## 🚨 Troubleshooting

### Sentry no reporta errores
```bash
# Verificar:
1. NEXT_PUBLIC_SENTRY_DSN está configurado
2. NODE_ENV === 'production'
3. Error no está en ignoreErrors list
4. Revisar Sentry dashboard → Settings → Inbound Filters
```

### Google Analytics no trackea
```bash
# Verificar:
1. NEXT_PUBLIC_GA_ID está configurado
2. Scripts se cargan (DevTools → Network)
3. Ad blockers deshabilitados
4. Esperar 24-48h para ver datos
```

### JWT_SECRET no funciona
```bash
# Verificar:
1. Secret tiene mínimo 32 caracteres
2. No tiene espacios ni caracteres especiales
3. Está en .env.local (no .env)
4. Servidor reiniciado después de cambio
```

---

## ✅ Checklist Final

- [ ] `.env.local` configurado con todas las variables (Supabase, Firebase client, Resend, Gemini)
- [ ] JWT_SECRET generado y configurado
- [ ] Sentry DSN configurado
- [ ] Google Analytics ID configurado
- [ ] Conexión a Supabase (URL y Anon/Service Key) configurada
- [ ] Base de datos migrada a multi-tenant (ejecutar `multitenant_migration.sql`)
- [ ] Políticas RLS y funciones helper creadas y verificadas en Supabase
- [ ] Perfil de Superadmin inicializado (`rol = 'superadmin'`)
- [ ] Probar flujo de acceso remoto (impersonación) y verificar registro de logs
- [ ] GitHub secrets configurados para CI/CD
- [ ] Vercel tokens obtenidos
- [ ] Testing de Sentry completado
- [ ] Testing de GA completado
- [ ] Testing de JWT y autenticación de roles completado

---

**Una vez completado este checklist, el proyecto estará 100% listo para producción.** 🚀
