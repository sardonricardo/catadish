export const sensualRatingLabels = ['Coqueteo', 'Tentación', 'Muy juguetón', 'Pecado serio', 'Éxtasis total']

export function getSensualRatingLabel(score: number) {
  const index = Math.max(0, Math.min(sensualRatingLabels.length - 1, Math.round(score) - 1))
  return sensualRatingLabels[index]
}
