<script setup>
// Rueda de carga estándar del sistema. Sin `card`, solo la rueda y el texto
// (para usar dentro de tablas o tarjetas que ya tienen su propio borde).
defineProps({
  texto: { type: String, default: 'Cargando Información...' },
  card:  { type: Boolean, default: false },
})
</script>

<template>
  <div
    :class="[
      'flex flex-col items-center justify-center gap-3',
      card ? 'py-24 bg-white rounded-xl border border-slate-200' : 'py-12',
    ]"
  >
    <svg class="w-10 h-10 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
    <p class="text-sm text-slate-500">{{ texto }}</p>
  </div>
</template>
