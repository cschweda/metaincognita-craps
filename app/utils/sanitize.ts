export function sanitizeName(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim().slice(0, 32)
}
