export const PALETTES = {
  default: ['#0d9488', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#f97316', '#6366f1', '#ec4899', '#14b8a6', '#84cc16'],
  bold: ['#e63946', '#457b9d', '#2d6a4f', '#f4a261', '#6d6875', '#264653', '#e9c46a', '#f3722c', '#90be6d', '#277da1'],
  pastel: ['#a8dadc', '#ffd6a5', '#c8b6ff', '#ffafcc', '#b7e4c7', '#ffc8a2', '#b5ead7', '#c7ceea', '#e2f0cb', '#ffdac1'],
  earth: ['#6b4226', '#a0785a', '#c8a97e', '#7c9a7e', '#4a7c59', '#c4722a', '#8b6245', '#5c8374', '#a3705f', '#d4a853'],
  viridis: ['#440154', '#31688e', '#35b779', '#fde725', '#443983', '#21908d', '#8fd744', '#b5de2b', '#1f9e89', '#482878'],
  monochrome: ['#1a1a1a', '#444444', '#666666', '#888888', '#aaaaaa', '#333333', '#555555', '#777777', '#999999', '#bbbbbb'],
}

export function coloursForCategories(categories, paletteName) {
  const palette = PALETTES[paletteName]
  if (!palette) return null
  return Object.fromEntries(categories.map((category, index) => [category, palette[index % palette.length]]))
}
