import { useState } from 'react'
import type { Effort, Genre, IngCategory, Ingredient, MainType, Recipe } from '../lib/types'
import { CATEGORY_LABEL, EFFORT_LABEL, GENRE_LABEL, MAIN_LABEL } from '../lib/types'
import Sheet from './Sheet'
import Icon from './Icon'

/**
 * 外部からレシピデータを流し込むための受け口。
 * 将来「写真から読み取り」（Claude API vision + structured outputs）を追加するときは、
 * 読み取り結果をこの形に整形して RecipeEditor の draft に渡すだけでよい。
 */
export interface RecipeDraft {
  name?: string
  genre?: Genre
  mainType?: MainType
  effort?: Effort
  ingredients?: Ingredient[]
}

interface Props {
  initial?: Recipe // 編集時
  draft?: RecipeDraft // 新規作成時の初期値（インポート受け口）
  onSave: (r: Recipe) => void
  onDelete?: () => void // 自作レシピの削除（内蔵レシピでは渡さない）
  onClose: () => void
}

const GENRES: Genre[] = ['wa', 'yo', 'chu', 'other']
const MAINS: MainType[] = ['meat', 'fish', 'other']
const EFFORTS: Effort[] = ['easy', 'normal', 'hard']
const CATS: IngCategory[] = ['veg', 'meatfish', 'other', 'seasoning']

const emptyIng = (): Ingredient => ({ name: '', qty: 0, unit: '', category: 'veg' })

export default function RecipeEditor({ initial, draft, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? draft?.name ?? '')
  const [genre, setGenre] = useState<Genre>(initial?.genre ?? draft?.genre ?? 'wa')
  const [mainType, setMainType] = useState<MainType>(initial?.mainType ?? draft?.mainType ?? 'meat')
  const [effort, setEffort] = useState<Effort>(initial?.effort ?? draft?.effort ?? 'easy')
  const [ings, setIngs] = useState<Ingredient[]>(
    initial?.ingredients ?? draft?.ingredients ?? [emptyIng()],
  )

  const updateIng = (i: number, patch: Partial<Ingredient>) => {
    setIngs(ings.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)))
  }

  const save = () => {
    const n = name.trim()
    if (!n) { alert('料理名を入力してください'); return }
    const cleaned = ings.filter((i) => i.name.trim())
    if (cleaned.length === 0) { alert('材料をひとつ以上入力してください'); return }
    onSave({
      id: initial?.id ?? `u${Date.now().toString(36)}`,
      name: n,
      genre,
      mainType,
      effort,
      ingredients: cleaned,
      isBuiltin: initial?.isBuiltin ?? false,
      disabled: initial?.disabled,
    })
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{initial ? 'レシピを編集' : 'レシピを追加'}</h2>

      <div className="field" style={{ marginTop: 10 }}>
        <label>料理名</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：鶏むね肉のチーズ焼き" />
      </div>

      <div className="field">
        <label>ジャンル</label>
        <div className="seg">
          {GENRES.map((g) => (
            <button key={g} className={genre === g ? 'on' : ''} onClick={() => setGenre(g)}>
              {GENRE_LABEL[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>メイン食材</label>
        <div className="seg">
          {MAINS.map((mt) => (
            <button key={mt} className={mainType === mt ? 'on' : ''} onClick={() => setMainType(mt)}>
              {MAIN_LABEL[mt]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>手間</label>
        <div className="seg">
          {EFFORTS.map((ef) => (
            <button key={ef} className={effort === ef ? 'on' : ''} onClick={() => setEffort(ef)}>
              {EFFORT_LABEL[ef]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>材料（2人分・分量0は「適量」）</label>
        {ings.map((ing, i) => (
          <div key={i} className="row" style={{ marginBottom: 6 }}>
            <input
              className="input grow"
              placeholder="材料名"
              value={ing.name}
              onChange={(e) => updateIng(i, { name: e.target.value })}
            />
            <input
              className="input"
              style={{ width: 62 }}
              type="number"
              min={0}
              step="0.25"
              value={ing.qty}
              onChange={(e) => updateIng(i, { qty: Number(e.target.value) || 0 })}
            />
            <input
              className="input"
              style={{ width: 56 }}
              placeholder="単位"
              value={ing.unit}
              onChange={(e) => updateIng(i, { unit: e.target.value })}
            />
            <select
              className="input"
              style={{ width: 76, padding: '11px 6px' }}
              value={ing.category}
              onChange={(e) => updateIng(i, { category: e.target.value as IngCategory })}
            >
              {CATS.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
            <button className="icon-btn" onClick={() => setIngs(ings.filter((_, idx) => idx !== i))}>
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
        <button className="btn small subtle" onClick={() => setIngs([...ings, emptyIng()])}>
          <Icon name="plus" size={14} />材料を追加
        </button>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn grow" onClick={save}>保存する</button>
        <button className="btn subtle" onClick={onClose}>キャンセル</button>
      </div>

      {onDelete && (
        <button className="btn small danger" style={{ marginTop: 12 }} onClick={onDelete}>
          <Icon name="trash" size={14} />このレシピを削除
        </button>
      )}
    </Sheet>
  )
}
