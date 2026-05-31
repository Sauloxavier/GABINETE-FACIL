// Cliente WAHA (WhatsApp HTTP API)
// Usa config do Supabase pra URL/key/session.

import type { AppConfig } from '@/features/config/api'

export interface WahaChat {
  id: string
  name?: string
  unreadCount?: number
  lastMessage?: {
    body?: string
    fromMe?: boolean
    timestamp?: number
  }
}

export interface WahaMessage {
  id: { id: string }
  body?: string
  fromMe: boolean
  timestamp: number
  ack?: number
  type?: string
  media?: { url?: string; mimetype?: string; filename?: string }
  hasMedia?: boolean
}

export interface WahaStatus {
  status: 'WORKING' | 'SCAN_QR_CODE' | 'STARTING' | 'STOPPED' | 'FAILED' | 'unknown'
  me?: { id: string; pushName?: string } | null
  qr?: string
}

export class WahaClient {
  private url: string
  private apiKey: string
  private session: string

  constructor(cfg: Pick<AppConfig, 'waha_url' | 'waha_api_key' | 'waha_session'>) {
    this.url = (cfg.waha_url || '').replace(/\/+$/, '')
    this.apiKey = cfg.waha_api_key || ''
    this.session = cfg.waha_session || 'default'
  }

  get isConfigured() {
    return !!this.url
  }

  private async fetch(path: string, init?: RequestInit) {
    if (!this.url) throw new Error('WAHA não configurado')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> ?? {}),
    }
    if (this.apiKey) headers['X-Api-Key'] = this.apiKey
    const res = await fetch(`${this.url}${path}`, { ...init, headers })
    if (!res.ok) throw new Error(`WAHA ${path}: HTTP ${res.status}`)
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
  }

  async status(): Promise<WahaStatus> {
    try {
      const data = await this.fetch(`/api/sessions/${this.session}`)
      return {
        status: data.status ?? 'unknown',
        me: data.me ?? null,
      }
    } catch {
      return { status: 'unknown' }
    }
  }

  async qr(): Promise<string | null> {
    try {
      const data = await this.fetch(`/api/${this.session}/auth/qr?format=image`)
      // pode vir base64 ou objeto com data url
      return typeof data === 'string' ? data : data.data ?? null
    } catch {
      return null
    }
  }

  async iniciar(): Promise<void> {
    await this.fetch(`/api/sessions/${this.session}/start`, { method: 'POST' })
  }

  async parar(): Promise<void> {
    await this.fetch(`/api/sessions/${this.session}/stop`, { method: 'POST' })
  }

  async listarChats(limit = 50): Promise<WahaChat[]> {
    return await this.fetch(`/api/${this.session}/chats?limit=${limit}`)
  }

  async mensagens(chatId: string, limit = 50): Promise<WahaMessage[]> {
    return await this.fetch(`/api/${this.session}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}&downloadMedia=false`)
  }

  async enviarTexto(chatId: string, texto: string): Promise<void> {
    await this.fetch('/api/sendText', {
      method: 'POST',
      body: JSON.stringify({ session: this.session, chatId, text: texto }),
    })
  }

  /** Envia imagem (PNG/JPG) com legenda opcional. URL deve ser acessível pelo servidor WAHA. */
  async enviarImagem(chatId: string, fileUrl: string, caption?: string): Promise<void> {
    await this.fetch('/api/sendImage', {
      method: 'POST',
      body: JSON.stringify({
        session: this.session,
        chatId,
        file: { url: fileUrl },
        caption,
      }),
    })
  }

  /** Envia áudio (OGG opus preferencialmente). URL acessível pelo servidor WAHA. */
  async enviarAudio(chatId: string, fileUrl: string): Promise<void> {
    await this.fetch('/api/sendVoice', {
      method: 'POST',
      body: JSON.stringify({
        session: this.session,
        chatId,
        file: { url: fileUrl },
      }),
    })
  }

  async fotoPerfil(chatId: string): Promise<string | null> {
    try {
      const data = await this.fetch(`/api/${this.session}/contacts/profile-picture?contactId=${encodeURIComponent(chatId)}`)
      return data.profilePictureURL ?? null
    } catch {
      return null
    }
  }
}
