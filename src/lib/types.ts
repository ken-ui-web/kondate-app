export type MealKind = 'main' | 'side' | 'soup'

export const MEAL_KINDS: MealKind[] = ['main', 'side', 'soup']

export const MEAL_LABEL: Record<MealKind, string> = {
  main: 'メインのおかず',
  side: '副菜',
  soup: '汁物',
}

export const MEAL_SHORT: Record<MealKind, string> = {
  main: 'メイン',
  side: '副菜',
  soup: '汁物',
}

/** 1日分の献立。未入力の項目はキーごと持たない */
export type DayMeals = Partial<Record<MealKind, string>>

/** 日付キーは "YYYY-MM-DD" */
export type MealPlan = Record<string, DayMeals>

export interface RecipeLink {
  url: string
  title: string
  /** 出典ページではなく、サイト内検索やGoogle検索への代替リンク */
  isSearch?: boolean
}

export interface RecipeSuggestion {
  name: string
  kind: string
  site: string
  description: string
  links: RecipeLink[]
}

/** レシピ画面の入力と直近の検索結果（アプリを閉じても残す） */
export interface RecipeSearchState {
  ingredients: string[]
  kinds: MealKind[]
  /** 直近に検索した条件。サイト別検索リンクはこの条件で作る */
  searched: { ingredients: string[]; kinds: MealKind[] } | null
  results: RecipeSuggestion[] | null
  searchSuggestionsHtml: string | null
}
