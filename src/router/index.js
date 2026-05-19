import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppLayout    from '../components/AppLayout.vue'
import LoginView    from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'

const EmpleadosIndex  = () => import('../views/empleados/EmpleadosIndex.vue')
const EmpleadoForm    = () => import('../views/empleados/EmpleadoForm.vue')
const EmpleadoDetalle = () => import('../views/empleados/EmpleadoDetalle.vue')

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
