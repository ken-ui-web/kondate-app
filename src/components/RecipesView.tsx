import { useMemo, useState } from 'react'
import type { Genre, Recipe } from '../lib/types'
import { EFFORT_LABEL, GENRE_LABEL } from '../lib/types'
import RecipeEditor from './RecipeEditor'

interface Props {
  recipes: Recipe[]
  setRecipes: (r: Recipe[]) => void
}

const FILTERS: (Genre | 'all')[] = ['all', 'wa', 'yo', 'chu', 'other']

export default function RecipesView({ recipes, setRecipes }: Props) {
  const [filter, setFilter] = useState<Genre | 'all'>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    let list = recipes
    if (filter !== 'all') list = list.filter((r) => r.genre === filter)
    if (search.trim()) list = list.filter((r) => r.name.includes(search.trim()))
    return list
  }, [recipes, filter, search])

  const upsert = (r: Recipe) => {
    const exists = recipes.some((x) => x.id === r.id)
    setRecipes(exists ? recipes.map((x) => (x.id === r.id ? r : x)) : [...recipes, r])
    setEditing(null)
    setCreating(false)
  }

  const toggleDisabled = (r: Recipe) => {
    setRecipes(recipes.map((x) => (x.id === r.id ? { ...x, disabled: !x.disabled } : x)))
  }

  const remove = (r: Recipe) => {
    if (!confirm(`「${r.name}」を削除しますか？`)) return
    setRecipes(recipes.filter((x) => x.id !== r.id))
    setEditing(null)
  }

  const activeCount = recipes.filter((r) => !r.disabled).length

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <input
          className="input grow"
          placeholder="レシピ名で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn" onClick={() => setCreating(true)}>＋ 追加</button>
      </div>

      <div className="seg" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'すべて' : GENRE_LABEL[f]}
          </button>
        ))}
      </div>

      <p className="hint" style={{ margin: '0 6px 8px' }}>
        {recipes.length}品（献立に使うのは {activeCount}品）。タップで編集できます。
      </p>

      <div className="card" style={{ padding: '4px 14px' }}>
        {filtered.map((r) => (
          <div key={r.id} className="list-item" style={{ opacity: r.disabled ? 0.45 : 1 }}>
            <div className="grow" onClick={() => setEditing(r)} style={{ cursor: 'pointer' }}>
              <div className="name">{r.name}</div>
              <div className="meta">
                {EFFORT_LABEL[r.effort]}・材料{r.ingredients.length}品
                {r.disabled ? '・使わない' : ''}
              </div>
            </div>
            <span className={`chip ${r.genre}`}>{GENRE_LABEL[r.genre]}</span>
            <button
              className="icon-btn"
              title={r.disabled ? '献立に使う' : '献立に使わない'}
              onClick={() => toggleDisabled(r)}
            >
              {r.disabled ? '💤' : '👌'}
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="hint" style={{ padding: 12 }}>見つかりませんでした</p>}
      </div>

      {(creating || editing) && (
        <RecipeEditor
          initial={editing ?? undefined}
          onSave={upsert}
          onDelete={editing && !editing.isBuiltin ? () => remove(editing) : undefined}
          onClose={() => { setEditing(null); setCreating(false) }}
        />
      )}
    </div>
  )
}
