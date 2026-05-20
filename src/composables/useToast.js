import { ref } from 'vue'

const toasts = ref([])
let _id = 0

function push(message, type = 'success') {
  const id = ++_id
  toasts.value.unshift({ id, message, type })
  setTimeout(() => dismiss(id), 4000)
}

function dismiss(id) {
  const i = toasts.value.findIndex(t => t.id === id)
  if (i !== -1) toasts.value.splice(i, 1)
}

export function useToast() {
  return {
    toasts,
    dismiss,
    success: (msg) => push(msg, 'success'),
    error:   (msg) => push(msg, 'error'),
    warning: (msg) => push(msg, 'warning'),
    info:    (msg) => push(msg, 'info'),
  }
}
