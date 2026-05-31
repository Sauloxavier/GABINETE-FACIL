import { useFotoPerfil } from '@/features/whatsapp/hooks'
import { iniciais } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  chatId: string | null
  nome: string
  className?: string
}

/** Avatar pra chats do WhatsApp: foto do contato (via WAHA) ou iniciais como fallback. */
export function AvatarChat({ chatId, nome, className }: Props) {
  const { data: foto } = useFotoPerfil(chatId)
  return (
    <div className={cn(
      'rounded-full bg-marco-azul text-white font-bold flex items-center justify-center flex-shrink-0 overflow-hidden',
      className,
    )}>
      {foto ? (
        <img src={foto} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{iniciais(nome)}</span>
      )}
    </div>
  )
}
