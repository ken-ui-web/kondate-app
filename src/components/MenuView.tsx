import { useRef, useState } from 'react'
import type { DayMeals, MealKind, MealPlan, SlotKey } from '../lib/types'
import { MEAL_KINDS, MEAL_LABEL, MEAL_SHORT } from '../lib/types'
import { addDays, dayOfWeek, fmtDisplay, parseDate, today } from '../lib/dates'
import Icon from './Icon'

interface Props {
  meals: MealPlan
  setMeals: React.Dispatch<React.SetStateAction<MealPlan>>
}

const DAYS = 14

export default function MenuView({ meals, setMeals }: Props) {
  const [page, setPage] = useState(0) // 2週間単位のずらし幅（0 = 今日から）
  const todayStr = today()
  const start = addDays(todayStr, page * DAYS)
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(start, i))

  const setMeal = (date: string, slot: SlotKey, value: string) => {
    setMeals((prev) => {
      const day = { ...(prev[date] ?? {}) }
      if (value) day[slot] = value
      else delete day[slot]
      const next = { ...prev }
      if (Object.keys(day).length > 0) next[date] = day
      else delete next[date]
      return next
    })
  }

  return (
    <div>
      <div className="range-nav">
        <button className="cal-nav" onClick={() => setPage(page - 1)} aria-label="前の2週間">
          <Icon name="chevron-left" size={17} />
        </button>
        <div className="range-label">
          <span className="range-sub">2週間のこんだて</span>
          {fmtDisplay(dates[0])} 〜 {fmtDisplay(dates[DAYS - 1])}
        </div>
        <button className="cal-nav" onClick={() => setPage(page + 1)} aria-label="次の2週間">
          <Icon name="chevron-right" size={17} />
        </button>
      </div>

      {page !== 0 && (
        <button className="btn small ghost block" style={{ marginBottom: 14 }} onClick={() => setPage(0)}>
          今日からの2週間に戻る
        </button>
      )}

      {dates.map((date, i) => (
        <div key={date}>
          {i === 7 && <div className="week-divider"><span>2週目</span></div>}
          <DayCard
            date={date}
            isToday={date === todayStr}
            meals={meals[date] ?? {}}
            onChange={(slot, value) => setMeal(date, slot, value)}
          />
        </div>
      ))}

      <p className="hint" style={{ textAlign: 'center', margin: '18px 6px 0' }}>
        入力した内容はこの端末に自動で保存されます
      </p>
    </div>
  )
}

function DayCard({
  date,
  isToday,
  meals,
  onChange,
}: {
  date: string
  isToday: boolean
  meals: DayMeals
  onChange: (slot: SlotKey, value: string) => void
}) {
  const dow = dayOfWeek(date)
  const d = parseDate(date)
  const weekend = dow.index === 0 || dow.index === 6
  const dinner = MEAL_KINDS.map((kind) => (
    <MealSlot
      key={kind}
      kind={kind}
      label={`${fmtDisplay(date)}の${weekend ? '夜の' : ''}${MEAL_LABEL[kind]}`}
      value={meals[kind] ?? ''}
      onChange={(v) => onChange(kind, v)}
    />
  ))
  return (
    <section className={`day-card ${isToday ? 'today' : ''}`}>
      <header className="day-head">
        <span className="day-date">{d.getMonth() + 1}/{d.getDate()}</span>
        <span className={`day-dow ${dow.index === 0 ? 'sun' : dow.index === 6 ? 'sat' : ''}`}>{dow.label}</span>
        {isToday && <span className="day-today">今日</span>}
      </header>
      {weekend ? (
        <>
          {/* 土日はお昼（メインのおかずのみ）も記録する */}
          <div className="meal-time"><Icon name="sun" size={12} />お昼</div>
          <MealSlot
            kind="main"
            label={`${fmtDisplay(date)}のお昼のメインのおかず`}
            value={meals.lunch ?? ''}
            onChange={(v) => onChange('lunch', v)}
          />
          <div className="meal-time"><Icon name="moon" size={12} />夜</div>
          {dinner}
        </>
      ) : (
        dinner
      )}
    </section>
  )
}

/**
 * 1品分の入力欄。
 * 見た目は「＋」ボタン／入力済みの料理名だが、中身は常に本物の入力欄にしている。
 * スマホでは、タップ後にJavaScriptで入力欄を出してフォーカスするとキーボードが開かない
 * ことがあるため、タップで直接フォーカスされる作りにしている。
 */
function MealSlot({
  kind,
  label,
  value,
  onChange,
}: {
  kind: MealKind
  /** 読み上げ用の名前（例：10/17（土）のお昼のメインのおかず） */
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const empty = value === ''

  return (
    <div className={`meal-slot ${kind}`}>
      <span className="meal-label">{MEAL_SHORT[kind]}</span>
      <div className={`meal-field ${empty ? 'empty' : 'filled'} ${focused ? 'focused' : ''}`}>
        <input
          ref={inputRef}
          className="meal-input"
          value={value}
          placeholder={focused ? `${MEAL_LABEL[kind]}を入力` : ''}
          enterKeyHint="done"
          aria-label={label}
          onFocus={(e) => {
            setFocused(true)
            // 入力済みならタップ時に全選択し、そのまま打てば別の料理名に置き換わるようにする
            const el = e.currentTarget
            window.setTimeout(() => el.setSelectionRange(0, el.value.length), 0)
          }}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            setFocused(false)
            const trimmed = e.currentTarget.value.trim()
            if (trimmed !== e.currentTarget.value) onChange(trimmed)
          }}
          onKeyDown={(e) => {
            // 日本語変換の確定Enterでは閉じない
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur()
          }}
        />
        {empty && !focused && (
          <span className="meal-plus" aria-hidden="true">
            <Icon name="plus" size={15} strokeWidth={2} />
          </span>
        )}
        {focused && !empty && (
          <button
            className="meal-clear"
            aria-label="消す"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
