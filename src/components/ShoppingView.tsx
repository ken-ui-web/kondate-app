import { useMemo, useState } from 'react'
import type { CustomShoppingItem, FridgeItem, MonthPlan, Recipe, Settings } from '../lib/types'
import { CATEGORY_LABEL, type IngCategory } from '../lib/types'
import { addDays, fmtDisplay, today, weekStartSat } from '../lib/dates'
import { buildShoppingList, fmtQty, type ShoppingItem } from '../lib/shopping'
import { guessCategory, namesMatch } from '../lib/ingredients'
import { buildIngredientLibrary } from '../lib/ingredientLibrary'
import Icon from './Icon'

interface Props {
  recipes: Recipe[]
  plans: Record<string, MonthPlan>
  fridge: FridgeItem[]
  setFridge: React.Dispatch<React.SetStateAction<FridgeItem[]>>
  settings: Settings
  checks: Record<string, boolean>
  setChecks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  customShopping: Record<string, CustomShoppingItem[]>
  setCustomShopping: React.Dispatch<React.SetStateAction<Record<string, CustomShoppingItem[]>>>
}

const CATEGORY_COLOR: Record<IngCategory, string> = {
  veg: 'var(--genre-wa)',
  meatfish: 'var(--genre-chu)',
  other: 'var(--accent)',
  seasoning: 'var(--genre-other)',
}

interface DisplayRow {
  key: string
  name: string
  category: IngCategory
  custom: boolean
  customId?: string
  computed?: ShoppingItem
}

export default function ShoppingView({
  recipes, plans, fridge, setFridge, settings, checks, setChecks,
  customShopping, setCustomShopping,
}: Props) {
  // 「今週末に買うもの」= 次に来る土曜はじまりの週を初期表示。
  // 週末（土日）の当日は買い出し中なので、今の週を表示する。
  const [offset, setOffset] = useState(0)
  const todayStr = today()
  const dow = new Date().getDay()
  const baseWeek =
    dow === 6 || dow === 0 ? weekStartSat(todayStr) : weekStartSat(addDays(todayStr, 6))
  const weekStart = addDays(baseWeek, offset * 7)
  const weekEnd = addDays(weekStart, 6)

  const [newItemName, setNewItemName] = useState('')

  const list = useMemo(
    () => buildShoppingList(weekStart, plans, recipes, settings, fridge),
    [weekStart, plans, recipes, settings, fridge],
  )

  const library = useMemo(() => buildIngredientLibrary(recipes), [recipes])
  const customItems = customShopping[weekStart] ?? []

  const rows: DisplayRow[] = useMemo(() => [
    ...list.items.map((it): DisplayRow => ({
      key: it.key, name: it.name, category: it.category, custom: false, computed: it,
    })),
    ...customItems.map((it): DisplayRow => ({
      key: `c:${it.id}`, name: it.name, category: it.category, custom: true, customId: it.id,
    })),
  ], [list, customItems])

  const checkKey = (rowKey: string) => `${weekStart}|${rowKey}`
  const toggle = (rowKey: string) => {
    const k = checkKey(rowKey)
    setChecks((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  const checkedRows = rows.filter((r) => checks[checkKey(r.key)])

  const addCustomItem = () => {
    const n = newItemName.trim()
    if (!n) return
    const category = guessCategory(n, library)
    const item: CustomShoppingItem = {
      id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: n,
      category,
    }
    setCustomShopping((prev) => ({ ...prev, [weekStart]: [...(prev[weekStart] ?? []), item] }))
    setNewItemName('')
  }

  const removeCustomItem = (id: string) => {
    setCustomShopping((prev) => ({
      ...prev,
      [weekStart]: (prev[weekStart] ?? []).filter((i) => i.id !== id),
    }))
    setChecks((prev) => {
      const next = { ...prev }
      delete next[checkKey(`c:${id}`)]
      return next
    })
  }

  const moveCheckedToFridge = () => {
    const additions = checkedRows
      .filter((r) => !fridge.some((f) => namesMatch(f.name, r.name)))
      .map((r) => ({ name: r.name }))
    if (additions.length > 0) setFridge((prev) => [...prev, ...additions])
    setChecks((prev) => {
      const next = { ...prev }
      for (const r of checkedRows) delete next[checkKey(r.key)]
      return next
    })
  }

  const grouped = useMemo(() => {
    const g = new Map<IngCategory, DisplayRow[]>()
    for (const row of rows) {
      if (!g.has(row.category)) g.set(row.category, [])
      g.get(row.category)!.push(row)
    }
    return g
  }, [rows])

  const isUpcoming = offset === 0

  return (
    <div>
      <div className="week-nav">
        <button className="cal-nav" onClick={() => setOffset(offset - 1)}>
          <Icon name="chevron-left" size={17} />
        </button>
        <div className="week-label" style={{ textAlign: 'center' }}>
          {fmtDisplay(weekStart)} 〜 {fmtDisplay(weekEnd)}
          <span className="sub">{isUpcoming ? '今週末の買い出しリスト' : '買い出しリスト'}</span>
        </div>
        <button className="cal-nav" onClick={() => setOffset(offset + 1)}>
          <Icon name="chevron-right" size={17} />
        </button>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <input
          className="input grow"
          placeholder="自分で買うものを追加（例：牛乳）"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
        />
        <button className="btn small" onClick={addCustomItem}>
          <Icon name="plus" size={14} />追加
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-ic"><Icon name="cart" size={40} strokeWidth={1.4} /></span>
          この週の献立がまだありません。<br />
          「こんだて」タブで献立を作成すると<br />買うものが自動で集まります
        </div>
      ) : (
        <>
          {[...grouped.entries()].map(([cat, items]) => (
            <div key={cat}>
              <div className="section-title">
                <span className="cat-dot" style={{ background: CATEGORY_COLOR[cat] }} />
                {CATEGORY_LABEL[cat]}
              </div>
              <div className="card" style={{ padding: '4px 14px' }}>
                {items.map((row) => {
                  const checked = !!checks[checkKey(row.key)]
                  return (
                    <div
                      key={row.key}
                      className={`check-row ${checked ? 'checked' : ''}`}
                      onClick={() => toggle(row.key)}
                    >
                      <span className="checkbox">
                        {checked && <Icon name="check" size={13} strokeWidth={2.8} />}
                      </span>
                      <span className="item-name">{row.name}</span>
                      {row.computed && <span className="qty">{fmtQty(row.computed)}</span>}
                      {row.custom && (
                        <button
                          className="icon-btn"
                          style={{ width: 26, height: 26 }}
                          onClick={(e) => { e.stopPropagation(); removeCustomItem(row.customId!) }}
                        >
                          <Icon name="x" size={11} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {checkedRows.length > 0 && (
            <button className="btn block" style={{ marginTop: 14 }} onClick={moveCheckedToFridge}>
              <Icon name="fridge" size={15} />
              チェックした {checkedRows.length} 品を冷蔵庫に入れる
            </button>
          )}

          {list.skippedFridge.length > 0 && (
            <p className="hint" style={{ margin: '14px 6px' }}>
              冷蔵庫にあるので省きました：{list.skippedFridge.join('、')}
            </p>
          )}

          <p className="hint" style={{ margin: '10px 6px' }}>
            人数設定（{settings.servings}人分）で分量を計算しています。調味料などの常備品は含まれません。
          </p>
        </>
      )}
    </div>
  )
}
