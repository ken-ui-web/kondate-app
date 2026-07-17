export type Genre = 'wa' | 'yo' | 'chu' | 'other'
export type MainType = 'meat' | 'fish' | 'other'
export type Effort = 'easy' | 'normal' | 'hard'
export type IngCategory = 'veg' | 'meatfish' | 'other' | 'seasoning'

/** qty === 0 は「適量」を意味する */
export interface Ingredient {
  name: string
  qty: number
  unit: string
  category: IngCategory
}

/** ingredients は2人分基準 */
export interface Recipe {
  id: string
  name: string
  genre: Genre
  mainType: MainType
  effort: Effort
  ingredients: Ingredient[]
  isBuiltin: boolean
  disabled?: boolean
}

/** 日付キーは "YYYY-MM-DD"。'none' は外食・献立なし */
export type DayEntry = string | 'none' | null

export interface MonthPlan {
  month: string // "YYYY-MM"
  days: Record<string, DayEntry>
}

export interface FridgeItem {
  name: string
  note?: string
}

export interface Settings {
  servings: number
  staples: string[]
}

export const GENRE_LABEL: Record<Genre, string> = {
  wa: '和食',
  yo: '洋食',
  chu: '中華',
  other: 'その他',
}

export const MAIN_LABEL: Record<MainType, string> = {
  meat: '肉',
  fish: '魚',
  other: 'その他',
}

export const EFFORT_LABEL: Record<Effort, string> = {
  easy: '簡単',
  normal: 'ふつう',
  hard: '手間あり',
}

export const CATEGORY_LABEL: Record<IngCategory, string> = {
  veg: '野菜・くだもの',
  meatfish: '肉・魚',
  other: 'その他食品',
  seasoning: '調味料',
}
