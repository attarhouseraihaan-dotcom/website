import { Search } from 'lucide-react'

export function EmptyState({ title = 'The catalogue is being prepared', text = 'Please contact Raihaan Attar House for current product information.' }: { title?: string; text?: string }) {
  return <div className="empty-state"><span className="empty-icon"><Search size={21} /></span><h3>{title}</h3><p>{text}</p></div>
}
