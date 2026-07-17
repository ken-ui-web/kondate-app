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

type Tab = 'calendar' | 'shopping' | 'fridge' | 'recipes' | 'settings'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'calendar', icon: '📅', label: 'こんだて' },
  { id: 'shopping', icon: '🛒', label: '買い物' },
  { id: 'fridge', icon: '🧊', label: '冷蔵庫' },
  { id: 'recipes', icon: '📖', label: 'レシピ' },
  { id: 'settings', icon: '⚙️', label: '設定' },
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
        <h1 className="app-title">献立管理アプリ</h1>
        <span className="app-sub">毎晩のごはん、おまかせ</span>
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
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
