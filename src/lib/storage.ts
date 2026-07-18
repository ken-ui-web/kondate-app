import type { CustomShoppingItem, FridgeItem, MonthPlan, Recipe, Settings } from './types'
import { BUILTIN_RECIPES } from '../data/builtinRecipes'

const KEYS = {
  recipes: 'kondate.recipes',
  plans: 'kondate.plans',
  fridge: 'kondate.fridge',
  settings: 'kondate.settings',
  checks: 'kondate.checks',
  customShopping: 'kondate.customShopping',
  apiKey: 'kondate.apiKey',
} as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

// --- レシピ（初回は内蔵レシピで初期化） ---

export function loadRecipes(): Recipe[] {
  const stored = load<Recipe[] | null>(KEYS.recipes, null)
  if (stored && stored.length > 0) return stored
  return BUILTIN_RECIPES
}

export function saveRecipes(recipes: Recipe[]) {
  save(KEYS.recipes, recipes)
}

// --- 献立プラン（月ごと） ---

export function loadPlans(): Record<string, MonthPlan> {
  return load(KEYS.plans, {})
}

export function savePlans(plans: Record<string, MonthPlan>) {
  save(KEYS.plans, plans)
}

// --- 冷蔵庫 ---

export function loadFridge(): FridgeItem[] {
  return load(KEYS.fridge, [])
}

export function saveFridge(items: FridgeItem[]) {
  save(KEYS.fridge, items)
}

// --- 設定 ---

export const DEFAULT_STAPLES = [
  '塩', 'こしょう', '砂糖', '醤油', '味噌', '酒', 'みりん', '酢',
  'サラダ油', 'ごま油', 'オリーブオイル', '片栗粉', '小麦粉',
  'ケチャップ', 'マヨネーズ', 'ソース', 'めんつゆ', '和風だし',
  'コンソメ', '鶏ガラスープの素', 'おろししょうが', 'おろしにんにく',
]

export function loadSettings(): Settings {
  return load(KEYS.settings, { servings: 2, staples: DEFAULT_STAPLES })
}

export function saveSettings(s: Settings) {
  save(KEYS.settings, s)
}

// --- 買い物チェック ---

export function loadChecks(): Record<string, boolean> {
  return load(KEYS.checks, {})
}

export function saveChecks(checks: Record<string, boolean>) {
  save(KEYS.checks, checks)
}

// --- 買い物リストの手動追加項目（週ごと） ---

export function loadCustomShopping(): Record<string, CustomShoppingItem[]> {
  return load(KEYS.customShopping, {})
}

export function saveCustomShopping(data: Record<string, CustomShoppingItem[]>) {
  save(KEYS.customShopping, data)
}

// --- Google AI Studio (Gemini) APIキー ---
// バックアップ（エクスポート/インポート）には含めない。この端末にだけ保存する。

export function loadApiKey(): string {
  return load(KEYS.apiKey, '')
}

export function saveApiKey(key: string) {
  save(KEYS.apiKey, key)
}

// --- エクスポート / インポート ---

export interface ExportData {
  app: 'kondate'
  version: 1
  exportedAt: string
  recipes: Recipe[]
  plans: Record<string, MonthPlan>
  fridge: FridgeItem[]
  settings: Settings
  checks: Record<string, boolean>
  customShopping?: Record<string, CustomShoppingItem[]>
}

export function exportAll(): ExportData {
  return {
    app: 'kondate',
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes: loadRecipes(),
    plans: loadPlans(),
    fridge: loadFridge(),
    settings: loadSettings(),
    checks: loadChecks(),
    customShopping: loadCustomShopping(),
  }
}

export function importAll(data: ExportData) {
  if (data.app !== 'kondate') throw new Error('このアプリのデータではありません')
  saveRecipes(data.recipes)
  savePlans(data.plans)
  saveFridge(data.fridge)
  saveSettings(data.settings)
  saveChecks(data.checks ?? {})
  saveCustomShopping(data.customShopping ?? {})
}
