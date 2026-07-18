import { useMemo, useRef, useState } from 'react'
import type { MonthPlan, Recipe } from '../lib/types'
import { EFFORT_LABEL, GENRE_LABEL, MAIN_LABEL } from '../lib/types'
import { addMonths, datesOfMonth, monthKey, parseDate, today } from '../lib/dates'
import { generateMonthPlan, rerollDay } from '../lib/planner'
import Sheet from './Sheet'
import Icon from './Icon'

interface Props {
  recipes: Recipe[]
  plans: Record<string, MonthPlan>
  setPlans: (p: Record<string, MonthPlan>) => void
}

const LONG_PRESS_MS = 320
const MOVE_THRESHOLD = 10

export default function CalendarView({ recipes, plans, setPlans }: Props) {
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [selected, setSelected] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [search, setSearch] = useState('')

  // --- 長押しドラッグでの並び替え ---
  const [dragDate, setDragDate] = useState<string | null>(null)
  const [overDate, setOverDate] = useState<string | null>(null)
  const dragTimer = useRef<number | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const movedRef = useRef(false)

  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])
  const plan = plans[month]
  const dates = datesOfMonth(month)
  const todayStr = today()

  const hasEntries = !!plan && Object.values(plan.days).some((v) => v)

  const generate = () => {
    if (hasEntries && !confirm('この月の献立を作り直しますか？（今の内容は上書きされます）')) return
    const newPlan = generateMonthPlan(month, recipes, plans)
    setPlans({ ...plans, [month]: newPlan })
  }

  const setDay = (date: string, entry: string | 'none' | null) => {
    const base = plans[month] ?? { month, days: {} }
    setPlans({ ...plans, [month]: { ...base, days: { ...base.days, [date]: entry } } })
  }

  const swapDays = (a: string, b: string) => {
    const base = plans[month] ?? { month, days: {} }
    const entryA = base.days[a] ?? null
    const entryB = base.days[b] ?? null
    setPlans({ ...plans, [month]: { ...base, days: { ...base.days, [a]: entryB, [b]: entryA } } })
  }

  const reroll = (date: string) => {
    const id = rerollDay(date, recipes, plans)
    if (id) setDay(date, id)
  }

  const clearDragTimer = () => {
    if (dragTimer.current != null) {
      window.clearTimeout(dragTimer.current)
      dragTimer.current = null
    }
  }

  const endDrag = () => {
    clearDragTimer()
    isDraggingRef.current = false
    setDragDate(null)
    setOverDate(null)
  }

  const onCellPointerDown = (date: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    startPos.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    isDraggingRef.current = false
    clearDragTimer()
    dragTimer.current = window.setTimeout(() => {
      isDraggingRef.current = true
      setDragDate(date)
      setOverDate(date)
    }, LONG_PRESS_MS)
  }

  const onCellPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startPos.current) {
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
        movedRef.current = true
        if (!isDraggingRef.current) clearDragTimer()
      }
    }
    if (isDraggingRef.current) {
      e.preventDefault()
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const cell = el?.closest<HTMLElement>('.cal-cell[data-date]')
      const d = cell?.dataset.date ?? null
      setOverDate((prev) => (prev === d ? prev : d))
    }
  }

  const onCellPointerUp = (date: string) => {
    clearDragTimer()
    if (isDraggingRef.current) {
      const target = overDate
      endDrag()
      if (target && target !== date) swapDays(date, target)
      return
    }
    endDrag()
    if (!movedRef.current) {
      setSelected(date); setPicking(false); setSearch('')
    }
  }

  const [y, m] = month.split('-').map(Number)
  const leadingBlanks = new Date(y, m - 1, 1).getDay() // 日曜はじまり

  const selectedEntry = selected ? plans[month]?.days[selected] : undefined
  const selectedRecipe =
    selectedEntry && selectedEntry !== 'none' ? recipeMap.get(selectedEntry) : undefined

  const activeRecipes = recipes.filter((r) => !r.disabled)
  const filtered = search
    ? activeRecipes.filter((r) => r.name.includes(search))
    : activeRecipes

  return (
    <div>
      <div className="cal-header">
        <button className="cal-nav" onClick={() => setMonth(addMonths(month, -1))}>
          <Icon name="chevron-left" size={17} />
        </button>
        <span className="cal-month">{y}年 {m}月</span>
        <button className="cal-nav" onClick={() => setMonth(addMonths(month, 1))}>
          <Icon name="chevron-right" size={17} />
        </button>
      </div>

      <button className="btn block" onClick={generate}>
        <Icon name={hasEntries ? 'refresh' : 'sparkles'} size={16} />
        {hasEntries ? 'この月の献立を作り直す' : 'この月の献立を作成する'}
      </button>

      {hasEntries && (
        <p className="hint" style={{ textAlign: 'center', margin: '10px 4px 0' }}>
          長押ししてドラッグすると、日付を入れ替えられます
        </p>
      )}

      <div style={{ height: 14 }} />

      <div className="cal-dow">
        {['日', '月', '火', '水', '木', '金', '土'].map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className="cal-grid">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="cal-cell empty" />
        ))}
        {dates.map((date) => {
          const entry = plan?.days[date]
          const recipe = entry && entry !== 'none' ? recipeMap.get(entry) : undefined
          const dow = parseDate(date).getDay()
          const isPast = date < todayStr
          const isDragSource = dragDate === date
          const isDragOver = dragDate !== null && overDate === date && overDate !== dragDate
          return (
            <div
              key={date}
              data-date={date}
              className={[
                'cal-cell',
                date === todayStr ? 'today' : '',
                isPast ? 'past' : '',
                isDragSource ? 'drag-source' : '',
                isDragOver ? 'drag-over' : '',
              ].join(' ').trim()}
              onPointerDown={(e) => onCellPointerDown(date, e)}
              onPointerMove={onCellPointerMove}
              onPointerUp={() => onCellPointerUp(date)}
              onPointerCancel={endDrag}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className={`cal-date ${dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''}`}>
                {Number(date.slice(-2))}
              </span>
              {recipe && <span className="cal-dish">{recipe.name}</span>}
              {entry === 'none' && <span className="cal-none">外食・なし</span>}
              {recipe && <div className={`cal-genre-bar ${recipe.genre}`} />}
            </div>
          )
        })}
      </div>

      {!hasEntries && (
        <div className="empty-state">
          <span className="empty-ic"><Icon name="soup" size={40} strokeWidth={1.4} /></span>
          「献立を作成する」を押すと<br />ひと月分の晩ごはんをおまかせで決めます
        </div>
      )}

      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          <h2 className="sheet-title">
            {m}月{Number(selected.slice(-2))}日の晩ごはん
          </h2>

          {!picking && (
            <>
              {selectedRecipe ? (
                <div className="card" style={{ marginTop: 10 }}>
                  <div className="dish-name">{selectedRecipe.name}</div>
                  <div className="tag-list">
                    <span className={`chip ${selectedRecipe.genre}`}>{GENRE_LABEL[selectedRecipe.genre]}</span>
                    <span className="chip plain">{MAIN_LABEL[selectedRecipe.mainType]}メイン</span>
                    <span className="chip plain">{EFFORT_LABEL[selectedRecipe.effort]}</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div className="section-title" style={{ margin: '0 0 4px' }}>材料（2人分）</div>
                    <div className="hint">
                      {selectedRecipe.ingredients
                        .map((i) => (i.qty > 0 ? `${i.name} ${i.qty}${i.unit}` : i.name))
                        .join('　・　')}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="hint" style={{ margin: '10px 4px' }}>
                  {selectedEntry === 'none' ? 'この日は外食・献立なしです。' : 'まだ献立が決まっていません。'}
                </p>
              )}

              <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => reroll(selected)}>
                  <Icon name="refresh" size={15} />引き直す
                </button>
                <button className="btn ghost" onClick={() => setPicking(true)}>
                  <Icon name="book" size={15} />選び直す
                </button>
                {selectedEntry !== 'none' ? (
                  <button className="btn subtle" onClick={() => { setDay(selected, 'none'); }}>
                    <Icon name="utensils" size={15} />外食・なしにする
                  </button>
                ) : (
                  <button className="btn subtle" onClick={() => reroll(selected)}>
                    <Icon name="sparkles" size={15} />献立を入れる
                  </button>
                )}
              </div>
            </>
          )}

          {picking && (
            <>
              <input
                className="input"
                placeholder="レシピ名で検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginTop: 8 }}
              />
              <div className="card" style={{ marginTop: 10, padding: '4px 14px' }}>
                {filtered.map((r) => (
                  <div
                    key={r.id}
                    className="list-item"
                    onClick={() => { setDay(selected, r.id); setPicking(false) }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="grow">
                      <div className="name">{r.name}</div>
                    </div>
                    <span className={`chip ${r.genre}`}>{GENRE_LABEL[r.genre]}</span>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="hint" style={{ padding: 12 }}>見つかりませんでした</p>
                )}
              </div>
            </>
          )}
        </Sheet>
      )}
    </div>
  )
}
