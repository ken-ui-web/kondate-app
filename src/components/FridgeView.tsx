import { useMemo, useState } from 'react'
import type { FridgeItem, MonthPlan, Recipe } from '../lib/types'
import { GENRE_LABEL } from '../lib/types'
import { namesMatch } from '../lib/ingredients'
import { today } from '../lib/dates'

interface Props {
  recipes: Recipe[]
  fridge: FridgeItem[]
  setFridge: React.Dispatch<React.SetStateAction<FridgeItem[]>>
  plans: Record<string, MonthPlan>
  setPlans: (p: Record<string, MonthPlan>) => void
}

interface Suggestion {
  recipe: Recipe
  score: number
  have: string[]
  need: string[]
}

export default function FridgeView({ recipes, fridge, setFridge, plans, setPlans }: Props) {
  const [name, setName] = useState('')
  const [showSuggest, setShowSuggest] = useState(false)
  const [adopted, setAdopted] = useState<string | null>(null)

  const addItem = () => {
    const n = name.trim()
    if (!n) return
    setFridge((prev) => (prev.some((f) => f.name === n) ? prev : [...prev, { name: n }]))
    setName('')
  }

  const removeItem = (i: number) => {
    setFridge((prev) => prev.filter((_, idx) => idx !== i))
  }

  const suggestions: Suggestion[] = useMemo(() => {
    if (!showSuggest || fridge.length === 0) return []
    const out: Suggestion[] = []
    for (const r of recipes) {
      if (r.disabled) continue
      // 調味料以外の材料で在庫マッチを見る
      const mains = r.ingredients.filter((i) => i.category !== 'seasoning')
      if (mains.length === 0) continue
      const have: string[] = []
      const need: string[] = []
      for (const ing of mains) {
        if (fridge.some((f) => namesMatch(f.name, ing.name))) have.push(ing.name)
        else need.push(ing.name)
      }
      if (have.length === 0) continue
      out.push({ recipe: r, score: have.length / mains.length, have, need })
    }
    out.sort((a, b) => b.score - a.score || a.need.length - b.need.length)
    return out.slice(0, 10)
  }, [showSuggest, fridge, recipes])

  const adoptToday = (recipeId: string) => {
    const t = today()
    const month = t.slice(0, 7)
    const base = plans[month] ?? { month, days: {} }
    setPlans({ ...plans, [month]: { ...base, days: { ...base.days, [t]: recipeId } } })
    setAdopted(recipeId)
    setTimeout(() => setAdopted(null), 2000)
  }

  return (
    <div>
      <div className="section-title">🧊 いま冷蔵庫にあるもの</div>

      <div className="row" style={{ marginBottom: 12 }}>
        <input
          className="input grow"
          placeholder="例：キャベツ、豚こま切れ肉"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <button className="btn" onClick={addItem}>追加</button>
      </div>

      {fridge.length === 0 ? (
        <div className="empty-state">
          <span className="big">🧊</span>
          冷蔵庫の中身を登録すると、<br />あるもので作れる献立を提案します
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 14px' }}>
          {fridge.map((item, i) => (
            <div key={`${item.name}-${i}`} className="list-item">
              <div className="grow">
                <div className="name">{item.name}</div>
              </div>
              <button className="icon-btn" onClick={() => removeItem(i)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {fridge.length > 0 && (
        <button className="btn block" style={{ marginTop: 8 }} onClick={() => setShowSuggest(true)}>
          🍳 冷蔵庫にあるもので提案してもらう
        </button>
      )}

      {showSuggest && (
        <>
          <div className="section-title">💡 おすすめ（マッチ率順）</div>
          {suggestions.length === 0 && (
            <p className="hint" style={{ margin: '0 6px' }}>
              在庫に合うレシピが見つかりませんでした。食材を追加してみてください。
            </p>
          )}
          {suggestions.map(({ recipe, score, have, need }) => (
            <div key={recipe.id} className="card fade-in">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{recipe.name}</div>
                <span className={`chip ${recipe.genre}`}>{GENRE_LABEL[recipe.genre]}</span>
              </div>
              <div className="match-bar-track">
                <div className="match-bar" style={{ width: `${Math.round(score * 100)}%` }} />
              </div>
              <div className="hint" style={{ marginTop: 4 }}>
                在庫マッチ {Math.round(score * 100)}%
              </div>
              <div className="tag-list">
                {have.map((n) => <span key={n} className="chip wa">✓ {n}</span>)}
                {need.map((n) => <span key={n} className="chip plain">＋{n}</span>)}
              </div>
              <button
                className={`btn small ${adopted === recipe.id ? '' : 'ghost'}`}
                style={{ marginTop: 12 }}
                onClick={() => adoptToday(recipe.id)}
              >
                {adopted === recipe.id ? '✓ 今日の献立にしました' : '📅 今日の献立にする'}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
