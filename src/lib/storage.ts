import type { MealPlan, RecipeSearchState } from './types'

const KEYS = {
  meals: 'kondate.meals',
  recipeSearch: 'kondate.recipeSearch',
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
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 容量超過やプライベートモードで保存できない場合も、画面の操作は続けられるようにする
  }
}

// --- 2週間の献立（日付ごとのメイン・副菜・汁物） ---

export function loadMeals(): MealPlan {
  return load(KEYS.meals, {})
}

export function saveMeals(meals: MealPlan) {
  save(KEYS.meals, meals)
}

// --- レシピ検索の入力と直近の結果 ---

export const EMPTY_RECIPE_SEARCH: RecipeSearchState = {
  ingredients: [],
  kinds: [],
  searched: null,
  results: null,
  searchSuggestionsHtml: null,
}

export function loadRecipeSearch(): RecipeSearchState {
  return { ...EMPTY_RECIPE_SEARCH, ...load<Partial<RecipeSearchState>>(KEYS.recipeSearch, {}) }
}

export function saveRecipeSearch(state: RecipeSearchState) {
  save(KEYS.recipeSearch, state)
}

// --- Google AI Studio (Gemini) APIキー ---
// この端末のブラウザ内にだけ保存する。

export function loadApiKey(): string {
  return load(KEYS.apiKey, '')
}

export function saveApiKey(key: string) {
  save(KEYS.apiKey, key)
}
