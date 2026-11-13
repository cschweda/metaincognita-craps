export function formatCents(cents: number): string {
  // Sign goes in front of the currency symbol: -$5, never $-5.
  if (cents < 0) return `-${formatCents(-cents)}`
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
  return cents >= 0 ? `+${formatCents(cents)}` : formatCents(cents)
}

export function formatPercent(decimal: number): string {
  return `${(decimal * 100).toFixed(2)}%`
}

/** Format cents to dollars for chip display ($5, $250, 1.5k) */
export function formatChipAmount(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`
  return `$${dollars}`
}
