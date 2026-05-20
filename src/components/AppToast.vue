<script setup>
import { useToast } from '../composables/useToast'

const { toasts, dismiss } = useToast()

const cfg = {
  success: {
    bar:  'border-l-emerald-500',
    icon: 'text-emerald-500',
    d:    'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  error: {
    bar:  'border-l-red-500',
    icon: 'text-red-500',
    d:    'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z',
  },
  warning: {
    bar:  'border-l-amber-500',
    icon: 'text-amber-500',
    d:    'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  },
  info: {
    bar:  'border-l-blue-500',
    icon: 'text-blue-500',
    d:    'M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
  },
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style="width:340px">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-8 scale-95"
        enter-to-class="opacity-100 translate-x-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0 scale-100"
        leave-to-class="opacity-0 translate-x-8 scale-95"
        move-class="transition-all duration-200"
      >
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="[
            'pointer-events-auto flex items-start gap-3 bg-white rounded-xl shadow-lg border border-slate-100 border-l-4 px-4 py-3.5',
            cfg[t.type].bar
          ]"
        >
          <svg
            :class="['w-5 h-5 mt-0.5 flex-shrink-0', cfg[t.type].icon]"
            fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" :d="cfg[t.type].d" />
          </svg>
          <span class="flex-1 text-sm text-slate-700 leading-snug">{{ t.message }}</span>
          <button
            @click="dismiss(t.id)"
            class="mt-0.5 flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
