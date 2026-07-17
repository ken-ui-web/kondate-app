import { useMemo, useState } from 'react'
import type { FridgeItem, MonthPlan, Recipe, Settings } from '../lib/types'
import { CATEGORY_LABEL, type IngCategory } from '../lib/types'
import { addDays, fmtDisplay, today, weekStartSat } from '../lib/dates'
import { buildShoppingList, fmtQty } from '../lib/shopping'
import { namesMatch } from '../lib/ingredients'
import Icon from './Icon'

interface Props {
  recipes: Recipe[]
  plans: Record<string, MonthPlan>
  fridge: FridgeItem[]
  setFridge: React.Dispatch<React.SetStateAction<FridgeItem[]>>
  settings: Settings
  checks: Record<string, boolean>
  setChecks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

const CATEGORY_COLOR: Record<IngCategory, string> = {
  veg: 'var(--genre-wa)',
  meatfish: 'var(--genre-chu)',
  other: 'var(--accent)',
  seasoning: 'var(--genre-other)',
}

export default function ShoppingView({
  recipes, plans, fridge, setFridge, settings, checks, setChecks,
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

  const list = useMemo(
    () => buildShoppingList(weekStart, plans, recipes, settings, fridge),
    [weekStart, plans, recipes, settings, fridge],
  )

  const checkKey = (itemKey: string) => `${weekStart}|${itemKey}`
  const toggle = (itemKey: string) => {
    const k = checkKey(itemKey)
    setChecks((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  const checkedItems = list.items.filter((i) => checks[checkKey(i.key)])

  const moveCheckedToFridge = () => {
    const additions = checkedItems
      .filter((i) => !fridge.some((f) => namesMatch(f.name, i.name)))
      .map((i) => ({ name: i.name }))
    if (additions.length > 0) setFridge((prev) => [...prev, ...additions])
    // チェックを消す
    setChecks((prev) => {
      const next = { ...prev }
      for (const i of checkedItems) delete next[checkKey(i.key)]
      return next
    })
  }

  const grouped = useMemo(() => {
    const g = new Map<IngCategory, typeof list.items>()
    for (const item of list.items) {
      if (!g.has(item.category)) g.set(item.category, [])
      g.get(item.category)!.push(item)
    }
    return g
  }, [list])

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

      {list.items.length === 0 ? (
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
                {items.map((item) => {
                  const checked = !!checks[checkKey(item.key)]
                  return (
                    <div
                      key={item.key}
                      className={`check-row ${checked ? 'checked' : ''}`}
                      onClick={() => toggle(item.key)}
                    >
                      <span className="checkbox">
                        {checked && <Icon name="check" size={13} strokeWidth={2.8} />}
                      </span>
                      <span className="item-name">{item.name}</span>
                      <span className="qty">{fmtQty(item)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {checkedItems.length > 0 && (
            <button className="btn block" style={{ marginTop: 14 }} onClick={moveCheckedToFridge}>
              <Icon name="fridge" size={15} />
              チェックした {checkedItems.length} 品を冷蔵庫に入れる
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
