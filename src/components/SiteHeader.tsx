import { useState } from 'react'
import { Instagram, Menu, MessageCircle, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useBusiness } from '../lib/BusinessContext'
import { whatsappLink } from '../lib/links'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const business = useBusiness()
  const close = () => setOpen(false)
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' is-active' : ''}`
  const wa = whatsappLink(business.whatsapp, `Hello ${business.name}, I would like to know more about your fragrance collection.`)

  return (
    <>
      <div className="announcement"><span className="announcement-mark" /> Discover your signature fragrance <span className="announcement-mark" /></div>
      <header className="site-header">
        <div className="header-inner wrap">
          <Link className="wordmark" to="/" onClick={close} aria-label={`${business.name} home`}>
            <span className="wordmark-monogram">R</span>
            <span><strong>{business.name.split('–')[0].trim()}</strong><small>{business.location.split(',').find((part) => part.trim().toLowerCase() === 'undi')?.trim().toUpperCase() ?? 'UNDI'} · FRAGRANCE</small></span>
          </Link>
          <button className="icon-button mobile-menu-button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className={`main-nav${open ? ' nav-open' : ''}`} aria-label="Main navigation">
            <NavLink className={navClass} to="/" end onClick={close}>Home</NavLink>
            <NavLink className={navClass} to="/shop" onClick={close}>Shop</NavLink>
            <NavLink className={navClass} to="/categories" onClick={close}>Categories</NavLink>
            <NavLink className={navClass} to="/about" onClick={close}>Our story</NavLink>
            <NavLink className={navClass} to="/contact" onClick={close}>Contact</NavLink>
            <a className="nav-social" href={business.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} /></a>
            <a className="button button-small button-outline nav-order" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
          </nav>
        </div>
      </header>
    </>
  )
}
