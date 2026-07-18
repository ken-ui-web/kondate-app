import { useMemo, useRef, useState } from 'react'
import type { Effort, Genre, IngCategory, Ingredient, MainType, Recipe, RecipeDraft } from '../lib/types'
import { EFFORT_LABEL, GENRE_LABEL, MAIN_LABEL } from '../lib/types'
import { buildIngredientLibrary } from '../lib/ingredientLibrary'
import { AiError, generateRecipeFromImage, generateRecipeFromName } from '../lib/ai'
import { fileToResizedJpeg } from '../lib/image'
import { loadApiKey } from '../lib/storage'
import Sheet from './Sheet'
import Icon from './Icon'
import IngredientPicker from './IngredientPicker'

interface Props {
  initial?: Recipe // 編集時
  draft?: RecipeDraft // 新規作成時の初期値（インポート受け口）
  allRecipes: Recipe[] // 材料タップ選択の候補を作るための全レシピ
  onSave: (r: Recipe) => void
  onDelete?: () => void // 自作レシピの削除（内蔵レシピでは渡さない）
  onClose: () => void
}

const GENRES: Genre[] = ['wa', 'yo', 'chu', 'other']
const MAINS: MainType[] = ['meat', 'fish', 'other']
const EFFORTS: Effort[] = ['easy', 'normal', 'hard']
const CAT_ORDER: IngCategory[] = ['veg', 'meatfish', 'other', 'seasoning']
const CATEGORY_SHORT: Record<IngCategory, string> = {
  veg: '野菜',
  meatfish: '肉・魚',
  other: 'その他',
  seasoning: '調味料',
}

export default function RecipeEditor({ initial, draft, allRecipes, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? draft?.name ?? '')
  const [genre, setGenre] = useState<Genre>(initial?.genre ?? draft?.genre ?? 'wa')
  const [mainType, setMainType] = useState<MainType>(initial?.mainType ?? draft?.mainType ?? 'meat')
  const [effort, setEffort] = useState<Effort>(initial?.effort ?? draft?.effort ?? 'easy')
  const [ings, setIngs] = useState<Ingredient[]>(initial?.ingredients ?? draft?.ingredients ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [aiBusy, setAiBusy] = useState<'name' | 'photo' | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const library = useMemo(() => buildIngredientLibrary(allRecipes), [allRecipes])

  const updateIng = (i: number, patch: Partial<Ingredient>) => {
    setIngs(ings.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)))
  }

  const bumpQty = (i: number) => (delta: number) => {
    const ing = ings[i]
    const step = ing.unit === 'g' || ing.unit === 'ml' ? 10 : 0.5
    const next = Math.max(0, Math.round((ing.qty + delta * step) * 100) / 100)
    updateIng(i, { qty: next })
  }

  const cycleCategory = (i: number) => {
    const cur = ings[i].category
    const next = CAT_ORDER[(CAT_ORDER.indexOf(cur) + 1) % CAT_ORDER.length]
    updateIng(i, { category: next })
  }

  const addFromPicker = (ing: Ingredient) => {
    setIngs((prev) => [...prev, ing])
  }

  const applyDraft = (d: RecipeDraft, opts: { includeName: boolean }) => {
    if (opts.includeName && d.name) setName(d.name)
    if (d.genre) setGenre(d.genre)
    if (d.mainType) setMainType(d.mainType)
    if (d.effort) setEffort(d.effort)
    if (d.ingredients) setIngs(d.ingredients)
  }

  const runAiFromName = async () => {
    const dishName = name.trim()
    if (!dishName) { setAiError('先に料理名を入力してください'); return }
    const apiKey = loadApiKey()
    if (!apiKey) { setAiError('設定画面でGoogle AI StudioのAPIキーを登録すると使えます'); return }
    setAiError(null)
    setAiBusy('name')
    try {
      const result = await generateRecipeFromName(apiKey, dishName)
      applyDraft(result, { includeName: false })
    } catch (e) {
      setAiError(e instanceof AiError ? e.message : '材料の自動入力に失敗しました')
    } finally {
      setAiBusy(null)
    }
  }

  const runAiFromPhoto = async (file: File) => {
    const apiKey = loadApiKey()
    if (!apiKey) { setAiError('設定画面でGoogle AI StudioのAPIキーを登録すると使えます'); return }
    setAiError(null)
    setAiBusy('photo')
    try {
      const { base64, mediaType } = await fileToResizedJpeg(file)
      const result = await generateRecipeFromImage(apiKey, base64, mediaType)
      applyDraft(result, { includeName: true })
    } catch (e) {
      setAiError(e instanceof AiError ? e.message : '写真の読み取りに失敗しました')
    } finally {
      setAiBusy(null)
    }
  }

  const save = () => {
    const n = name.trim()
    if (!n) { alert('料理名を入力してください'); return }
    const cleaned = ings.filter((i) => i.name.trim())
    if (cleaned.length === 0) { alert('材料をひとつ以上追加してください'); return }
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

      <div className="row" style={{ marginBottom: 6 }}>
        <button className="btn small ghost grow" onClick={runAiFromName} disabled={aiBusy !== null}>
          <Icon name="sparkles" size={14} />
          {aiBusy === 'name' ? 'AIが考え中…' : 'AIで材料を入力'}
        </button>
        <button
          className="btn small ghost grow"
          onClick={() => photoInputRef.current?.click()}
          disabled={aiBusy !== null}
        >
          <Icon name="camera" size={14} />
          {aiBusy === 'photo' ? '読み取り中…' : '写真から読み取る'}
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) runAiFromPhoto(f)
            e.target.value = ''
          }}
        />
      </div>
      {aiError && (
        <p className="hint" style={{ color: 'var(--danger)', margin: '0 2px 14px' }}>{aiError}</p>
      )}
      {!aiError && <div style={{ height: 8 }} />}

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
        <label>材料（2人分）</label>

        {ings.map((ing, i) => (
          <div key={i} className="ing-row">
            <div className="row">
              <input
                className="input grow"
                placeholder="材料名"
                value={ing.name}
                onChange={(e) => updateIng(i, { name: e.target.value })}
              />
              <button className="icon-btn" onClick={() => setIngs(ings.filter((_, idx) => idx !== i))}>
                <Icon name="x" size={13} />
              </button>
            </div>
            <div className="row ing-row-2">
              <div className="qty-stepper">
                <button className="icon-btn" onClick={() => bumpQty(i)(-1)}><Icon name="minus" size={12} /></button>
                <input
                  className="input qty-num"
                  type="number"
                  step="0.25"
                  min={0}
                  value={ing.qty}
                  onChange={(e) => updateIng(i, { qty: Number(e.target.value) || 0 })}
                />
                <button className="icon-btn" onClick={() => bumpQty(i)(1)}><Icon name="plus" size={12} /></button>
              </div>
              <input
                className="input"
                style={{ width: 58 }}
                placeholder="単位"
                value={ing.unit}
                onChange={(e) => updateIng(i, { unit: e.target.value })}
              />
              <button
                className={`chip ${ing.category === 'veg' ? 'wa' : ing.category === 'meatfish' ? 'chu' : ing.category === 'seasoning' ? 'yo' : 'plain'}`}
                onClick={() => cycleCategory(i)}
                style={{ marginLeft: 'auto', border: 'none', cursor: 'pointer' }}
              >
                {CATEGORY_SHORT[ing.category]}
              </button>
            </div>
          </div>
        ))}

        {ings.length === 0 && (
          <p className="hint" style={{ margin: '2px 2px 10px' }}>下のボタンから材料をタップして追加してください</p>
        )}

        {pickerOpen ? (
          <IngredientPicker
            library={library}
            existingNames={ings.map((i) => i.name)}
            onPick={addFromPicker}
            onClose={() => setPickerOpen(false)}
          />
        ) : (
          <button className="btn small subtle block" onClick={() => setPickerOpen(true)}>
            <Icon name="plus" size={14} />材料を追加
          </button>
        )}
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
