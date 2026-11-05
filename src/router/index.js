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
const ConstanciasIndex   = () => import('../views/constancias/ConstanciasIndex.vue')
const VacacionesIndex    = () => import('../views/vacaciones/VacacionesIndex.vue')

const AguinaldoCrear   = () => import('../views/aguinaldo/AguinaldoCrear.vue')
const AguinaldoDetalle = () => import('../views/aguinaldo/AguinaldoDetalle.vue')
const CargarMarcas     = () => import('../views/planillas/CargarMarcas.vue')
const IngresosDeduccionesIndex = () => import('../views/planillas/IngresosDeduccionesIndex.vue')
const LogSistemaIndex      = () => import('../views/log-sistema/LogSistemaIndex.vue')
const UsuariosIndex        = () => import('../views/usuarios/UsuariosIndex.vue')
const RolesIndex           = () => import('../views/roles/RolesIndex.vue')
const CamposVariablesIndex = () => import('../views/campos-variables/CamposVariablesIndex.vue')
const CumpleanosIndex          = () => import('../views/cumpleanos/CumpleanosIndex.vue')
const EstadisticaLaboralIndex  = () => import('../views/estadistica-laboral/EstadisticaLaboralIndex.vue')
const InformacionLaboralIndex  = () => import('../views/estadistica-laboral/InformacionLaboralIndex.vue')
const SalariosDevengadosIndex  = () => import('../views/estadistica-laboral/SalariosDevengadosIndex.vue')
const ListadoCumpleanosIndex   = () => import('../views/estadistica-laboral/ListadoCumpleanosIndex.vue')
const MovimientosPersonalIndex = () => import('../views/estadistica-laboral/MovimientosPersonalIndex.vue')

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
          meta: { requiresAuth: true, permiso: 'empleados.ver', title: 'Empleados' },
        },
        {
          path: 'empleados/crear',
          name: 'empleados.crear',
          component: EmpleadoForm,
          meta: { requiresAuth: true, permiso: 'empleados.crear', title: 'Nuevo Empleado' },
        },
        {
          path: 'empleados/:id',
          name: 'empleados.detalle',
          component: EmpleadoDetalle,
          meta: { requiresAuth: true, permiso: 'empleados.ver', title: 'Ficha de Empleado' },
        },
        {
          path: 'empleados/:id/editar',
          name: 'empleados.editar',
          component: EmpleadoForm,
          meta: { requiresAuth: true, permiso: 'empleados.editar', title: 'Editar Empleado' },
        },

        // Vacaciones
        {
          path: 'vacaciones',
          name: 'vacaciones',
          component: VacacionesIndex,
          meta: { requiresAuth: true, permiso: 'vacaciones.ver', title: 'Vacaciones' },
        },

        // Incidencias
        {
          path: 'incidencias',
          name: 'incidencias',
          component: IncidenciasIndex,
          meta: { requiresAuth: true, permiso: 'incidencias.ver', title: 'Incidencias' },
        },

        // Constancias
        {
          path: 'constancias',
          name: 'constancias',
          component: ConstanciasIndex,
          meta: { requiresAuth: true, permiso: ['constancias.laboral', 'constancias.bancaria', 'constancias.voucher'], title: 'Constancias' },
        },

        // Bancos
        {
          path: 'bancos',
          name: 'bancos',
          component: BancosIndex,
          meta: { requiresAuth: true, permiso: 'bancos.ver', title: 'Bancos' },
        },

        // Estructura organizacional
        {
          path: 'departamentos',
          name: 'departamentos',
          component: DepartamentosIndex,
          meta: { requiresAuth: true, permiso: 'departamentos.ver', title: 'Departamentos' },
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
          meta: { requiresAuth: true, permiso: 'planillas.ver', title: 'Planillas de Pago' },
        },
        {
          path: 'planillas/crear',
          name: 'planillas.crear',
          component: PlanillaCrear,
          meta: { requiresAuth: true, permiso: 'planillas.crear', title: 'Nueva Planilla' },
        },
        {
          path: 'planillas/:id',
          name: 'planillas.detalle',
          component: PlanillaDetalle,
          meta: { requiresAuth: true, permiso: 'planillas.ver', title: 'Detalle de Planilla' },
        },

        // Aguinaldo
        {
          path: 'aguinaldo',
          name: 'aguinaldo',
          component: AguinaldoIndex,
          meta: { requiresAuth: true, permiso: 'aguinaldo.ver', title: 'Planillas Especiales' },
        },
        {
          path: 'aguinaldo/crear',
          name: 'aguinaldo.crear',
          component: AguinaldoCrear,
          meta: { requiresAuth: true, permiso: 'aguinaldo.crear', title: 'Nueva Planilla Especial' },
        },
        {
          path: 'aguinaldo/:nombre',
          name: 'aguinaldo.detalle',
          component: AguinaldoDetalle,
          meta: { requiresAuth: true, permiso: 'aguinaldo.ver', title: 'Detalle de Planilla Especial' },
        },

        // Ingresos/deducciones recurrentes (préstamos, adelantos, bonos fijos)
        {
          path: 'ingresos-deducciones',
          name: 'ingresos-deducciones',
          component: IngresosDeduccionesIndex,
          meta: { requiresAuth: true, permiso: 'ingresos_deducciones.ver', title: 'Ingresos/Deducciones' },
        },

        // Marcas de los relojes biométricos (CSV)
        {
          path: 'cargar-marcas',
          name: 'cargar-marcas',
          component: CargarMarcas,
          meta: { requiresAuth: true, permiso: 'marcas.ver', title: 'Cargar Marcas' },
        },

        // Cumpleaños
        {
          path: 'cumpleanos',
          name: 'cumpleanos',
          component: CumpleanosIndex,
          meta: { requiresAuth: true, permiso: 'cumpleanos.ver', title: 'Cumpleaños' },
        },

        // Estadística laboral
        {
          path: 'estadistica-laboral',
          name: 'estadistica-laboral',
          component: EstadisticaLaboralIndex,
          meta: { requiresAuth: true, permiso: 'estadistica.ver', title: 'Estadística Laboral' },
        },
        {
          path: 'listado-cumpleanos',
          name: 'listado-cumpleanos',
          component: ListadoCumpleanosIndex,
          meta: { requiresAuth: true, permiso: 'listado_cumpleanos.ver', title: 'Listado de Cumpleaños' },
        },
        {
          path: 'salarios-devengados',
          name: 'salarios-devengados',
          component: SalariosDevengadosIndex,
          meta: { requiresAuth: true, permiso: 'salarios_devengados.ver', title: 'Salarios Devengados' },
        },
        {
          path: 'informacion-laboral',
          name: 'informacion-laboral',
          component: InformacionLaboralIndex,
          meta: { requiresAuth: true, permiso: 'informacion_laboral.ver', title: 'Información Laboral' },
        },
        {
          path: 'movimientos-personal',
          name: 'movimientos-personal',
          component: MovimientosPersonalIndex,
          meta: { requiresAuth: true, permiso: 'movimientos.ver', title: 'Movimientos de Personal' },
        },

        // Bitácora
        {
          path: 'bitacora',
          name: 'bitacora',
          component: LogSistemaIndex,
          meta: { requiresAuth: true, permiso: 'bitacora.ver', title: 'Bitácora' },
        },

        // Campos Variables
        {
          path: 'campos-variables',
          name: 'campos-variables',
          component: CamposVariablesIndex,
          meta: { requiresAuth: true, permiso: 'campos_variables.ver', title: 'Campos Variables' },
        },

        // Gestión de usuarios
        {
          path: 'usuarios',
          name: 'usuarios',
          component: UsuariosIndex,
          meta: { requiresAuth: true, permiso: 'usuarios.ver', title: 'Gestión de Usuarios' },
        },

        // Gestión de roles y sus permisos
        {
          path: 'roles',
          name: 'roles',
          component: RolesIndex,
          meta: { requiresAuth: true, permiso: 'roles.ver', title: 'Gestión de Roles' },
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
  } else if (to.meta.permiso && authStore.isAuthenticated && !authStore.puede(to.meta.permiso)) {
    // Sin permiso para la pantalla (se asigna en Gestión de Roles). El backend también lo rechaza (403).
    next({ name: 'dashboard' })
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
