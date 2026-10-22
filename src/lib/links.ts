export function whatsappLink(number: string, message: string) {
  const fullNumber = indiaE164(number).replace(/^\+/, '')
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`
}

export function indiaE164(number: string) {
  const digits = number.replace(/\D/g, '')
  return `+${digits.startsWith('91') ? digits : `91${digits}`}`
}
