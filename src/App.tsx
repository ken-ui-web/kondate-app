import { useEffect, useState } from 'react'
import type { MealPlan, RecipeSearchState } from './lib/types'
import { loadMeals, loadRecipeSearch, saveMeals, saveRecipeSearch } from './lib/storage'
import MenuView from './components/MenuView'
import RecipeSearchView from './components/RecipeSearchView'
import Icon, { type IconName } from './components/Icon'

type Tab = 'menu' | 'recipe'

const TABS: { id: Tab; icon: IconName; label: string }[] = [
  { id: 'menu', icon: 'calendar', label: 'こんだて' },
  { id: 'recipe', icon: 'book', label: 'レシピ' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('menu')
  const [meals, setMeals] = useState<MealPlan>(loadMeals)
  const [recipeSearch, setRecipeSearch] = useState<RecipeSearchState>(loadRecipeSearch)

  useEffect(() => saveMeals(meals), [meals])
  useEffect(() => saveRecipeSearch(recipeSearch), [recipeSearch])

  return (
    <>
      <header className="app-header">
        <span className="app-eyebrow">DINNER PLANNER</span>
        <h1 className="app-title">献立管理アプリ</h1>
      </header>

      <main className="view" key={tab}>
        {tab === 'menu' && <MenuView meals={meals} setMeals={setMeals} />}
        {tab === 'recipe' && <RecipeSearchView state={recipeSearch} setState={setRecipeSearch} />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => {
              setTab(t.id)
              window.scrollTo(0, 0)
            }}
          >
            <span className="tab-ic">
              <Icon name={t.icon} size={20} strokeWidth={1.7} />
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
