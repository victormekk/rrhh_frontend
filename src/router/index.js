import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppLayout    from '../components/AppLayout.vue'
import LoginView    from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'

const EmpleadosIndex  = () => import('../views/empleados/EmpleadosIndex.vue')
const EmpleadoForm    = () => import('../views/empleados/EmpleadoForm.vue')
const EmpleadoDetalle = () => import('../views/empleados/EmpleadoDetalle.vue')

const PlanillasIndex  = () => import('../views/planillas/PlanillasIndex.vue')
const PlanillaCrear   = () => import('../views/planillas/PlanillaCrear.vue')
const PlanillaDetalle = () => import('../views/planillas/PlanillaDetalle.vue')

const AguinaldoIndex  = () => import('../views/aguinaldo/AguinaldoIndex.vue')

const DepartamentosIndex = () => import('../views/departamentos/DepartamentosIndex.vue')
const BancosIndex        = () => import('../views/bancos/BancosIndex.vue')
const IncidenciasIndex   = () => import('../views/incidencias/IncidenciasIndex.vue')
const VacacionesIndex    = () => import('../views/vacaciones/VacacionesIndex.vue')

const AguinaldoCrear   = () => import('../views/aguinaldo/AguinaldoCrear.vue')
const AguinaldoDetalle = () => import('../views/aguinaldo/AguinaldoDetalle.vue')
const LogSistemaIndex      = () => import('../views/log-sistema/LogSistemaIndex.vue')
const UsuariosIndex        = () => import('../views/usuarios/UsuariosIndex.vue')
const CamposVariablesIndex = () => import('../views/campos-variables/CamposVariablesIndex.vue')
const CumpleanosIndex          = () => import('../views/cumpleanos/CumpleanosIndex.vue')
const EstadisticaLaboralIndex  = () => import('../views/estadistica-laboral/EstadisticaLaboralIndex.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guest: true },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView,
          meta: { requiresAuth: true, title: 'Dashboard' },
        },

        // Empleados
        {
          path: 'empleados',
          name: 'empleados',
          component: EmpleadosIndex,
          meta: { requiresAuth: true, title: 'Empleados' },
        },
        {
          path: 'empleados/crear',
          name: 'empleados.crear',
          component: EmpleadoForm,
          meta: { requiresAuth: true, title: 'Nuevo Empleado' },
        },
        {
          path: 'empleados/:id',
          name: 'empleados.detalle',
          component: EmpleadoDetalle,
          meta: { requiresAuth: true, title: 'Ficha de Empleado' },
        },
        {
          path: 'empleados/:id/editar',
          name: 'empleados.editar',
          component: EmpleadoForm,
          meta: { requiresAuth: true, title: 'Editar Empleado' },
        },

        // Vacaciones
        {
          path: 'vacaciones',
          name: 'vacaciones',
          component: VacacionesIndex,
          meta: { requiresAuth: true, title: 'Vacaciones' },
        },

        // Incidencias
        {
          path: 'incidencias',
          name: 'incidencias',
          component: IncidenciasIndex,
          meta: { requiresAuth: true, title: 'Incidencias' },
        },

        // Bancos
        {
          path: 'bancos',
          name: 'bancos',
          component: BancosIndex,
          meta: { requiresAuth: true, title: 'Bancos' },
        },

        // Estructura organizacional
        {
          path: 'departamentos',
          name: 'departamentos',
          component: DepartamentosIndex,
          meta: { requiresAuth: true, title: 'Estructura Organizacional' },
        },
        {
          path: 'puestos',
          redirect: '/departamentos',
        },

        // Planillas
        {
          path: 'planillas',
          name: 'planillas',
          component: PlanillasIndex,
          meta: { requiresAuth: true, title: 'Planillas' },
        },
        {
          path: 'planillas/crear',
          name: 'planillas.crear',
          component: PlanillaCrear,
          meta: { requiresAuth: true, title: 'Nueva Planilla' },
        },
        {
          path: 'planillas/:id',
          name: 'planillas.detalle',
          component: PlanillaDetalle,
          meta: { requiresAuth: true, title: 'Detalle de Planilla' },
        },

        // Aguinaldo
        {
          path: 'aguinaldo',
          name: 'aguinaldo',
          component: AguinaldoIndex,
          meta: { requiresAuth: true, title: 'Aguinaldo' },
        },
        {
          path: 'aguinaldo/crear',
          name: 'aguinaldo.crear',
          component: AguinaldoCrear,
          meta: { requiresAuth: true, title: 'Generar Aguinaldo' },
        },
        {
          path: 'aguinaldo/:nombre',
          name: 'aguinaldo.detalle',
          component: AguinaldoDetalle,
          meta: { requiresAuth: true, title: 'Detalle de Aguinaldo' },
        },

        // Cumpleaños
        {
          path: 'cumpleanos',
          name: 'cumpleanos',
          component: CumpleanosIndex,
          meta: { requiresAuth: true, title: 'Cumpleaños' },
        },

        // Estadística laboral
        {
          path: 'estadistica-laboral',
          name: 'estadistica-laboral',
          component: EstadisticaLaboralIndex,
          meta: { requiresAuth: true, title: 'Estadística Laboral' },
        },

        // Log del sistema
        {
          path: 'log-sistema',
          name: 'log-sistema',
          component: LogSistemaIndex,
          meta: { requiresAuth: true, title: 'Log del Sistema' },
        },

        // Campos Variables (solo admin)
        {
          path: 'campos-variables',
          name: 'campos-variables',
          component: CamposVariablesIndex,
          meta: { requiresAuth: true, title: 'Campos Variables' },
        },

        // Gestión de usuarios (solo admin)
        {
          path: 'usuarios',
          name: 'usuarios',
          component: UsuariosIndex,
          meta: { requiresAuth: true, title: 'Gestión de Usuarios' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchUser()
    } catch {
      authStore.clearAuth()
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
