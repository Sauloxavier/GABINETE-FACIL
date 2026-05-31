// Registra o service worker e detecta evento de instalação PWA.
// Roda 1x no boot do app.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installPrompt: BeforeInstallPromptEvent | null = null

export function inicializarPWA() {
  if (typeof window === 'undefined') return

  // Registra Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] sw register falhou:', err)
      })
    })
  }

  // Captura prompt de instalação
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPrompt = e as BeforeInstallPromptEvent
    window.dispatchEvent(new Event('pwa-install-disponivel'))
  })

  window.addEventListener('appinstalled', () => {
    installPrompt = null
    window.dispatchEvent(new Event('pwa-instalado'))
  })
}

export function podeInstalarPWA(): boolean {
  return !!installPrompt
}

export async function instalarPWA(): Promise<boolean> {
  if (!installPrompt) return false
  try {
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    return choice.outcome === 'accepted'
  } finally {
    installPrompt = null
  }
}

export function estaInstalado(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
         // @ts-expect-error iOS Safari
         (navigator.standalone === true)
}
