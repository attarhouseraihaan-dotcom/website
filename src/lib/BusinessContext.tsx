import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getBusinessInfo } from './catalog'
import { defaultBusiness, type BusinessInfo } from './types'

const BusinessContext = createContext<BusinessInfo>(defaultBusiness)

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState(defaultBusiness)
  useEffect(() => { void getBusinessInfo().then(setBusiness) }, [])
  return <BusinessContext.Provider value={business}>{children}</BusinessContext.Provider>
}

export function useBusiness() {
  return useContext(BusinessContext)
}
