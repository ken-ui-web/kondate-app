import { useEffect, useRef, useState } from 'react'
import type { MealKind, RecipeSearchState } from '../lib/types'
import { MEAL_KINDS, MEAL_LABEL } from '../lib/types'
import { loadApiKey, saveApiKey } from '../lib/storage'
import { RECIPE_SITES, SearchError, searchRecipes, siteQuery } from '../lib/recipeSearch'
import Icon from './Icon'

interface Props {
  state: RecipeSearchState
  setState: React.Dispatch<React.SetStateAction<RecipeSearchState>>
}

/** 「鶏肉、大根 にんじん」のようなまとめ入力も分けて受け付ける */
function splitIngredients(raw: string): string[] {
  return raw
    .split(/[、,，\s　]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function RecipeSearchView({ state, setState }: Props) {
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState(loadApiKey)
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { ingredients, kinds, searched, results, searchSuggestionsHtml } = state

  const addIngredients = (raw: string): string[] => {
    const added = splitIngredients(raw)
    const next = [...ingredients]
    for (const a of added) if (!next.includes(a)) next.push(a)
    setState((s) => ({ ...s, ingredients: next }))
    setDraft('')
    return next
  }

  const removeIngredient = (name: string) => {
    setState((s) => ({ ...s, ingredients: s.ingredients.filter((i) => i !== name) }))
  }

  const toggleKind = (kind: MealKind) => {
    setState((s) => ({
      ...s,
      kinds: s.kinds.includes(kind)
        ? s.kinds.filter((k) => k !== kind)
        // 表示順（メイン→副菜→汁物）をそろえておく
        : MEAL_KINDS.filter((k) => k === kind || s.kinds.includes(k)),
    }))
  }

  const runSearch = async () => {
    // 入力欄に打ちかけの食材があれば、それも含めて検索する
    const list = draft.trim() ? addIngredients(draft) : ingredients
    if (list.length === 0) {
      setError('使う食材を1つ以上入力してください')
      return
    }
    setError(null)
    setState((s) => ({ ...s, searched: { ingredients: list, kinds }, results: null, searchSuggestionsHtml: null }))

    // 画面の入力欄の値を正とする（貼り付けて欄から出ずに検索した場合も拾えるよう、ここで保存もする）
    const key = apiKey.trim()
    saveApiKey(key)
    if (!key) {
      setSettingsOpen(true)
      return
    }

    setLoading(true)
    try {
      const r = await searchRecipes(key, list, kinds)
      setState((s) => ({ ...s, results: r.recipes, searchSuggestionsHtml: r.searchSuggestionsHtml }))
    } catch (e) {
      setError(e instanceof SearchError ? e.message : 'レシピの検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const commitApiKey = () => {
    saveApiKey(apiKey.trim())
    setKeySaved(true)
    window.setTimeout(() => setKeySaved(false), 1500)
  }

  const hasKey = apiKey.trim() !== ''
  const query = searched ? siteQuery(searched.ingredients, searched.kinds) : ''

  return (
    <div>
      <div className="section-title">
        <Icon name="search" size={14} />使う食材
      </div>
      <div className="card">
        <div className="row">
          <input
            className="input grow"
            placeholder="例：鶏肉、大根"
            value={draft}
            enterKeyHint="enter"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && draft.trim()) addIngredients(draft)
            }}
          />
          <button className="btn small" onClick={() => draft.trim() && addIngredients(draft)}>
            <Icon name="plus" size={14} />追加
          </button>
        </div>
        {ingredients.length > 0 ? (
          <div className="tag-list" style={{ marginTop: 12 }}>
            {ingredients.map((name) => (
              <span key={name} className="ing-tag">
                {name}
                <button aria-label={`${name}を外す`} onClick={() => removeIngredient(name)}>
                  <Icon name="x" size={11} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="hint" style={{ margin: '10px 2px 0' }}>食材はいくつでも追加できます</p>
        )}
      </div>

      <div className="section-title">
        <Icon name="utensils" size={14} />料理の種類
      </div>
      <div className="kind-checks">
        {MEAL_KINDS.map((kind) => (
          <label key={kind} className={`kind-check ${kind} ${kinds.includes(kind) ? 'on' : ''}`}>
            <input type="checkbox" checked={kinds.includes(kind)} onChange={() => toggleKind(kind)} />
            <span className="kind-box">
              {kinds.includes(kind) && <Icon name="check" size={12} strokeWidth={2.8} />}
            </span>
            {MEAL_LABEL[kind]}
          </label>
        ))}
      </div>

      <button className="btn block" style={{ marginTop: 18 }} onClick={runSearch} disabled={loading}>
        <Icon name="search" size={16} />
        {loading ? 'レシピサイトを検索中…' : 'レシピを検索'}
      </button>

      {error && <p className="hint error-text" style={{ margin: '12px 4px 0' }}>{error}</p>}

      {searched && (
        <div className="results">
          <div className="section-title">
            <Icon name="sparkles" size={14} />AIが見つけたレシピ案
          </div>

          {loading && <LoadingCards />}

          {!loading && !results && !hasKey && (
            <div className="card notice">
              AIでレシピ案をまとめて表示するには、下の「AI検索の設定」でGoogle AI StudioのAPIキーを登録してください。
              キーがなくても、その下のボタンから各レシピサイトで直接探せます。
            </div>
          )}

          {!loading && results && results.map((r, i) => (
            <article key={`${r.name}-${i}`} className="card recipe-card fade-in">
              <div className="recipe-meta">
                {r.kind && <span className={`chip ${kindChipClass(r.kind)}`}>{r.kind}</span>}
                {r.site && <span className="recipe-site">{r.site}</span>}
              </div>
              <h3 className="recipe-name">{r.name}</h3>
              {r.description && <p className="recipe-desc">{r.description}</p>}
              <div className="recipe-links">
                {r.links.map((l) => (
                  <a
                    key={l.url}
                    className={`btn small ${l.isSearch ? 'ghost' : ''}`}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.isSearch ? l.title : 'レシピを見る'}
                    <Icon name="external" size={13} />
                  </a>
                ))}
              </div>
              {!r.links[0]?.isSearch && (
                <p className="recipe-source">出典：{r.links.map((l) => l.title).join('、')}</p>
              )}
            </article>
          ))}

          {!loading && searchSuggestionsHtml && <SearchSuggestions html={searchSuggestionsHtml} />}

          <div className="section-title">
            <Icon name="book" size={14} />レシピサイトで直接探す
          </div>
          <p className="hint" style={{ margin: '0 4px 10px' }}>「{query}」で各サイトを検索します</p>
          <div className="site-links">
            {RECIPE_SITES.map((s) => (
              <a key={s.host} className="site-link" href={s.url(query)} target="_blank" rel="noopener noreferrer">
                {s.name}
                <Icon name="external" size={13} />
              </a>
            ))}
          </div>
        </div>
      )}

      <details
        className="settings-panel"
        open={settingsOpen}
        onToggle={(e) => setSettingsOpen(e.currentTarget.open)}
      >
        <summary>
          <Icon name="key" size={14} />AI検索の設定
          <span className={`key-status ${hasKey ? 'ok' : ''}`}>{hasKey ? '設定済み' : '未設定'}</span>
        </summary>
        <div className="settings-body">
          <p className="hint" style={{ marginTop: 0 }}>
            AIによるレシピ検索には、ご自身のGoogle AI Studio（Gemini）のAPIキーが必要です。
            無料枠を超えると料金がかかる場合があります。
          </p>
          <div className="row">
            <input
              className="input grow"
              type={showKey ? 'text' : 'password'}
              placeholder="APIキーを貼り付け"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={commitApiKey}
              autoComplete="off"
              spellCheck={false}
            />
            <button className="icon-btn" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? 'キーを隠す' : 'キーを表示'}>
              <Icon name={showKey ? 'eye-off' : 'eye'} size={15} />
            </button>
          </div>
          {keySaved && <p className="hint" style={{ color: 'var(--ok)', margin: '8px 2px 0' }}>保存しました</p>}
          <p className="hint" style={{ marginBottom: 0 }}>
            キーは aistudio.google.com/apikey で発行できます。この端末のブラウザ内にだけ保存され、ほかの人には共有されません。
          </p>
        </div>
      </details>
    </div>
  )
}

function kindChipClass(kind: string): string {
  if (kind.includes('メイン') || kind.includes('主菜')) return 'yo'
  if (kind.includes('副菜')) return 'wa'
  if (kind.includes('汁')) return 'chu'
  return 'plain'
}

function LoadingCards() {
  return (
    <>
      <p className="hint" style={{ margin: '0 4px 10px' }}>レシピサイトを検索しています（10〜30秒ほどかかります）</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card skeleton">
          <div className="sk-line short" />
          <div className="sk-line" />
          <div className="sk-line long" />
        </div>
      ))}
    </>
  )
}

/**
 * Google検索の候補（グラウンディング結果に添えて表示するよう定められている部品）。
 * Google提供のHTMLとCSSなので、アプリのスタイルと干渉しないよう Shadow DOM に入れる。
 */
function SearchSuggestions({ html }: { html: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    root.innerHTML = html
    root.querySelectorAll('a').forEach((a) => {
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
    })
  }, [html])
  return <div ref={hostRef} className="search-suggestions" />
}
