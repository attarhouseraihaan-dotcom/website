import { Instagram, MapPin, MessageCircle, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBusiness } from '../lib/BusinessContext'
import { whatsappLink } from '../lib/links'

export function SiteFooter() {
  const business = useBusiness()
  const wa = whatsappLink(business.whatsapp, `Hello ${business.name}, I would like to know more about your fragrance collection.`)
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <span className="footer-monogram">R</span>
          <div><strong>{business.name.toUpperCase()}</strong><small>UNDI · ANDHRA PRADESH</small></div>
          <p>A place to explore fragrance and find something that feels personal.</p>
        </div>
        <div className="footer-column"><h3>Explore</h3><Link to="/shop">Shop all</Link><Link to="/categories">Categories</Link><Link to="/about">About us</Link></div>
        <div className="footer-column"><h3>Visit & enquire</h3><span><MapPin size={15} /> {business.location}</span><a href={`tel:${business.enquiries}`}><Phone size={15} /> {business.enquiries}</a><a href={wa} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp orders</a><a href={business.instagram} target="_blank" rel="noreferrer"><Instagram size={15} /> Instagram</a></div>
        <div className="footer-column"><h3>Information</h3><Link to="/privacy-policy">Privacy policy</Link><Link to="/terms">Terms & conditions</Link></div>
      </div>
      <div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Raihaan Attar House – Undi</span><span>Made for the love of fragrance</span></div>
    </footer>
  )
}
