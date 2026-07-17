import type { FridgeItem, IngCategory, MonthPlan, Recipe, Settings } from './types'
import { namesMatch, normalizeName } from './ingredients'
import { weekDates } from './dates'

export interface ShoppingItem {
  key: string
  name: string
  qty: number // 合計（人数換算済み）。0で「適量」のみ
  unit: string
  approx: boolean // 「適量」の材料を含む
  category: IngCategory
  usedIn: string[] // 使うレシピ名
}

export interface ShoppingList {
  items: ShoppingItem[]
  skippedFridge: string[] // 冷蔵庫にあるため除外した材料名
}

/** weekStart（土曜）からの1週間分の買い物リストを作る */
export function buildShoppingList(
  weekStart: string,
  plans: Record<string, MonthPlan>,
  recipes: Recipe[],
  settings: Settings,
  fridge: FridgeItem[],
): ShoppingList {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]))
  const agg = new Map<string, ShoppingItem>()

  for (const date of weekDates(weekStart)) {
    const entry = plans[date.slice(0, 7)]?.days[date]
    if (!entry || entry === 'none') continue
    const recipe = recipeMap.get(entry)
    if (!recipe) continue

    for (const ing of recipe.ingredients) {
      // 常備品は買い足し不要
      if (settings.staples.some((s) => namesMatch(s, ing.name))) continue

      const key = `${normalizeName(ing.name)}|${ing.unit}`
      const scaled = ing.qty * (settings.servings / 2)
      const existing = agg.get(key)
      if (existing) {
        existing.qty += scaled
        if (ing.qty === 0) existing.approx = true
        if (!existing.usedIn.includes(recipe.name)) existing.usedIn.push(recipe.name)
      } else {
        agg.set(key, {
          key,
          name: ing.name,
          qty: scaled,
          unit: ing.unit,
          approx: ing.qty === 0,
          category: ing.category,
          usedIn: [recipe.name],
        })
      }
    }
  }

  const items: ShoppingItem[] = []
  const skippedFridge: string[] = []
  for (const item of agg.values()) {
    if (fridge.some((f) => namesMatch(f.name, item.name))) {
      skippedFridge.push(item.name)
    } else {
      items.push(item)
    }
  }

  const order: IngCategory[] = ['veg', 'meatfish', 'other', 'seasoning']
  items.sort(
    (a, b) =>
      order.indexOf(a.category) - order.indexOf(b.category) ||
      a.name.localeCompare(b.name, 'ja'),
  )

  return { items, skippedFridge }
}

/** 分量の表示用文字列 */
export function fmtQty(item: ShoppingItem): string {
  if (item.qty <= 0) return '適量'
  const n = Math.round(item.qty * 100) / 100
  const s = String(n)
  return item.approx ? `${s}${item.unit}＋適量` : `${s}${item.unit}`
}
