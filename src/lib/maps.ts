export function buildGoogleMapsLink(input: { name?: string | null; address?: string | null; city?: string | null }) {
  const parts = [input.name, input.address, input.city]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))

  if (parts.length === 0) {
    return null
  }

  const query = encodeURIComponent(parts.join(', '))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}
