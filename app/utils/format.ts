export function formatCents(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) {
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
  if (cents % 100 === 0) {
    return `$${dollars.toFixed(0)}`
  }
  return `$${dollars.toFixed(2)}`
}

export function formatRatio(ratio: [number, number]): string {
  return `${ratio[0]}:${ratio[1]}`
}

export function formatSignedCents(cents: number): string {
  const prefix = cents >= 0 ? '+' : ''
  return `${prefix}${formatCents(Math.abs(cents))}`
}

export function formatPercent(decimal: number): string {
  return `${(decimal * 100).toFixed(2)}%`
}
