import type { IngCategory, Recipe } from './types'

export interface LibraryIngredient {
  name: string
  unit: string
  category: IngCategory
  qty: number
  count: number
}

function mode(nums: number[]): number {
  const freq = new Map<number, number>()
  for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1)
  let best = nums[0]
  let bestCount = 0
  for (const [n, c] of freq) {
    if (c > bestCount) { best = n; bestCount = c }
  }
  return best
}

/**
 * 既存レシピ（内蔵＋自作）の材料から、タップ選択用の材料ライブラリを作る。
 * よく使われる材料ほど上位に来るよう出現回数で並べる。
 */
export function buildIngredientLibrary(recipes: Recipe[]): LibraryIngredient[] {
  const map = new Map<string, { unit: string; category: IngCategory; qtys: number[]; count: number }>()
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const key = ing.name.trim()
      if (!key) continue
      const entry = map.get(key)
      if (entry) {
        entry.count++
        entry.qtys.push(ing.qty)
      } else {
        map.set(key, { unit: ing.unit, category: ing.category, qtys: [ing.qty], count: 1 })
      }
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      unit: v.unit,
      category: v.category,
      qty: mode(v.qtys),
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'))
}
