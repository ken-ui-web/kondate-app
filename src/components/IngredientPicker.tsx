import { useMemo, useState } from 'react'
import type { Ingredient } from '../lib/types'
import type { LibraryIngredient } from '../lib/ingredientLibrary'
import { normalizeName } from '../lib/ingredients'
import Icon from './Icon'

interface Props {
  library: LibraryIngredient[]
  existingNames: string[] // すでに追加済みの材料名（候補から除外）
  onPick: (ing: Ingredient) => void
  onClose: () => void
}

const MAX_SUGGESTIONS = 30

export default function IngredientPicker({ library, existingNames, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')

  const existing = useMemo(
    () => new Set(existingNames.map((n) => normalizeName(n))),
    [existingNames],
  )

  const suggestions = useMemo(() => {
    const q = normalizeName(query)
    const pool = library.filter((l) => !existing.has(normalizeName(l.name)))
    const filtered = q ? pool.filter((l) => normalizeName(l.name).includes(q)) : pool
    return filtered.slice(0, MAX_SUGGESTIONS)
  }, [library, existing, query])

  const exactMatch = query.trim() && library.some((l) => normalizeName(l.name) === normalizeName(query))

  const pickLibrary = (l: LibraryIngredient) => {
    onPick({ name: l.name, qty: l.qty, unit: l.unit, category: l.category })
    setQuery('')
  }

  const pickCustom = () => {
    const n = query.trim()
    if (!n) return
    onPick({ name: n, qty: 0, unit: '', category: 'other' })
    setQuery('')
  }

  return (
    <div className="ing-picker">
      <div className="row">
        <input
          className="input grow"
          placeholder="材料名で検索、またはタップして選択"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !exactMatch && query.trim() && pickCustom()}
          autoFocus
        />
        <button className="btn small subtle" onClick={onClose}>閉じる</button>
      </div>

      <div className="ing-chip-list">
        {suggestions.map((l) => (
          <button key={l.name} className="ing-chip" onClick={() => pickLibrary(l)}>
            {l.name}
          </button>
        ))}
        {query.trim() && !exactMatch && (
          <button className="ing-chip new" onClick={pickCustom}>
            <Icon name="plus" size={12} />「{query.trim()}」を追加
          </button>
        )}
        {suggestions.length === 0 && !query.trim() && (
          <p className="hint" style={{ padding: '4px 2px' }}>よく使う材料がここに表示されます</p>
        )}
      </div>
    </div>
  )
}
