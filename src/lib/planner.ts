import type { MonthPlan, Recipe } from './types'
import { addDays, datesOfMonth } from './dates'

const AVOID_WINDOW = 14 // この日数以内に出た料理は選ばない
const AVOID_WINDOW_MIN = 7 // レシピが少ないときの緩和値

/** plans（全月）＋生成途中の days から、date の前 windowDays 日間に使われたレシピIDを集める */
function recentIds(
  date: string,
  windowDays: number,
  plans: Record<string, MonthPlan>,
  extraDays: Record<string, string | 'none' | null> = {},
): Set<string> {
  const ids = new Set<string>()
  for (let i = 1; i <= windowDays; i++) {
    const d = addDays(date, -i)
    const entry = extraDays[d] ?? plans[d.slice(0, 7)]?.days[d]
    if (entry && entry !== 'none') ids.add(entry)
  }
  return ids
}

function entryAt(
  date: string,
  plans: Record<string, MonthPlan>,
  extraDays: Record<string, string | 'none' | null> = {},
): string | 'none' | null {
  return extraDays[date] ?? plans[date.slice(0, 7)]?.days[date] ?? null
}

interface WeightCtx {
  prevRecipe?: Recipe
  nextRecipe?: Recipe
  genreCount: Record<string, number>
  mainCount: Record<string, number>
}

function weightOf(r: Recipe, ctx: WeightCtx): number {
  let w = 1
  // 前日・翌日と同ジャンル/同主材料は選ばれにくく
  if (ctx.prevRecipe) {
    if (r.genre === ctx.prevRecipe.genre) w *= 0.35
    if (r.mainType === ctx.prevRecipe.mainType) w *= 0.4
  }
  if (ctx.nextRecipe) {
    if (r.genre === ctx.nextRecipe.genre) w *= 0.35
    if (r.mainType === ctx.nextRecipe.mainType) w *= 0.4
  }
  // 月内で出現の多いジャンル・主材料ほど重みを下げる（偏り補正）
  w *= 1 / (1 + (ctx.genreCount[r.genre] ?? 0) * 0.25)
  w *= 1 / (1 + (ctx.mainCount[r.mainType] ?? 0) * 0.15)
  return w
}

function weightedPick(recipes: Recipe[], ctx: WeightCtx): Recipe | null {
  if (recipes.length === 0) return null
  const weights = recipes.map((r) => weightOf(r, ctx))
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (let i = 0; i < recipes.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return recipes[i]
  }
  return recipes[recipes.length - 1]
}

function activeRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.filter((r) => !r.disabled)
}

function byId(recipes: Recipe[]): Map<string, Recipe> {
  return new Map(recipes.map((r) => [r.id, r]))
}

/**
 * 1か月分の献立を生成する。
 * keepDays に含まれる日（'none' 指定や既存を残したい日）はそのまま維持。
 */
export function generateMonthPlan(
  month: string,
  recipes: Recipe[],
  plans: Record<string, MonthPlan>,
  keepDays: Record<string, string | 'none' | null> = {},
): MonthPlan {
  const pool = activeRecipes(recipes)
  const map = byId(recipes)
  const window = pool.length >= AVOID_WINDOW * 1.5 ? AVOID_WINDOW : AVOID_WINDOW_MIN

  const days: Record<string, string | 'none' | null> = {}
  const genreCount: Record<string, number> = {}
  const mainCount: Record<string, number> = {}

  for (const date of datesOfMonth(month)) {
    if (keepDays[date] !== undefined) {
      days[date] = keepDays[date]
      const kept = keepDays[date]
      if (kept && kept !== 'none') {
        const r = map.get(kept)
        if (r) {
          genreCount[r.genre] = (genreCount[r.genre] ?? 0) + 1
          mainCount[r.mainType] = (mainCount[r.mainType] ?? 0) + 1
        }
      }
      continue
    }

    const avoid = recentIds(date, window, plans, days)
    let candidates = pool.filter((r) => !avoid.has(r.id))
    if (candidates.length === 0) candidates = pool

    const prevEntry = entryAt(addDays(date, -1), plans, days)
    const prevRecipe = prevEntry && prevEntry !== 'none' ? map.get(prevEntry) : undefined

    const picked = weightedPick(candidates, { prevRecipe, genreCount, mainCount })
    days[date] = picked?.id ?? null
    if (picked) {
      genreCount[picked.genre] = (genreCount[picked.genre] ?? 0) + 1
      mainCount[picked.mainType] = (mainCount[picked.mainType] ?? 0) + 1
    }
  }

  return { month, days }
}

/** 1日だけ引き直す。現在のレシピと直近±windowの重複を避け、前後の日と整合させる */
export function rerollDay(
  date: string,
  recipes: Recipe[],
  plans: Record<string, MonthPlan>,
): string | null {
  const pool = activeRecipes(recipes)
  const map = byId(recipes)
  const window = pool.length >= AVOID_WINDOW * 1.5 ? AVOID_WINDOW : AVOID_WINDOW_MIN

  const current = entryAt(date, plans)
  const avoid = recentIds(date, window, plans)
  // 未来方向の重複も避ける
  for (let i = 1; i <= window; i++) {
    const e = entryAt(addDays(date, i), plans)
    if (e && e !== 'none') avoid.add(e)
  }
  if (current && current !== 'none') avoid.add(current)

  let candidates = pool.filter((r) => !avoid.has(r.id))
  if (candidates.length === 0) {
    candidates = pool.filter((r) => r.id !== current)
  }
  if (candidates.length === 0) return current === 'none' ? null : current

  const prevEntry = entryAt(addDays(date, -1), plans)
  const nextEntry = entryAt(addDays(date, 1), plans)
  const picked = weightedPick(candidates, {
    prevRecipe: prevEntry && prevEntry !== 'none' ? map.get(prevEntry) : undefined,
    nextRecipe: nextEntry && nextEntry !== 'none' ? map.get(nextEntry) : undefined,
    genreCount: {},
    mainCount: {},
  })
  return picked?.id ?? null
}
