import { useEffect, useState } from 'react'
import type { FridgeItem, MonthPlan, Recipe, Settings } from './lib/types'
import {
  loadChecks, loadFridge, loadPlans, loadRecipes, loadSettings,
  saveChecks, saveFridge, savePlans, saveRecipes, saveSettings,
} from './lib/storage'
import CalendarView from './components/CalendarView'
import ShoppingView from './components/ShoppingView'
import FridgeView from './components/FridgeView'
import RecipesView from './components/RecipesView'
import SettingsView from './components/SettingsView'
import Icon, { type IconName } from './components/Icon'

type Tab = 'calendar' | 'shopping' | 'fridge' | 'recipes' | 'settings'

const TABS: { id: Tab; icon: IconName; label: string }[] = [
  { id: 'calendar', icon: 'calendar', label: 'こんだて' },
  { id: 'shopping', icon: 'cart', label: '買い物' },
  { id: 'fridge', icon: 'fridge', label: '冷蔵庫' },
  { id: 'recipes', icon: 'book', label: 'レシピ' },
  { id: 'settings', icon: 'settings', label: '設定' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('calendar')
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes)
  const [plans, setPlans] = useState<Record<string, MonthPlan>>(loadPlans)
  const [fridge, setFridge] = useState<FridgeItem[]>(loadFridge)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [checks, setChecks] = useState<Record<string, boolean>>(loadChecks)

  useEffect(() => saveRecipes(recipes), [recipes])
  useEffect(() => savePlans(plans), [plans])
  useEffect(() => saveFridge(fridge), [fridge])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveChecks(checks), [checks])

  // 設定インポート後などに全状態を読み直す
  const reloadAll = () => {
    setRecipes(loadRecipes())
    setPlans(loadPlans())
    setFridge(loadFridge())
    setSettings(loadSettings())
    setChecks(loadChecks())
  }

  return (
    <>
      <header className="app-header">
        <span className="app-eyebrow">DINNER PLANNER</span>
        <h1 className="app-title">献立管理アプリ</h1>
      </header>

      <main className="view" key={tab}>
        {tab === 'calendar' && (
          <CalendarView recipes={recipes} plans={plans} setPlans={setPlans} />
        )}
        {tab === 'shopping' && (
          <ShoppingView
            recipes={recipes} plans={plans} fridge={fridge} setFridge={setFridge}
            settings={settings} checks={checks} setChecks={setChecks}
          />
        )}
        {tab === 'fridge' && (
          <FridgeView
            recipes={recipes} fridge={fridge} setFridge={setFridge}
            plans={plans} setPlans={setPlans}
          />
        )}
        {tab === 'recipes' && (
          <RecipesView recipes={recipes} setRecipes={setRecipes} />
        )}
        {tab === 'settings' && (
          <SettingsView settings={settings} setSettings={setSettings} onImported={reloadAll} />
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
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
