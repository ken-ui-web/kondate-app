import type { MealKind, RecipeLink, RecipeSuggestion } from './types'
import { MEAL_LABEL } from './types'

/**
 * 食材からレシピ案を探す。
 *
 * Gemini API に Google 検索ツール（グラウンディング）を付けて呼び、実在するレシピページを検索させる。
 * リンクはAIが書いたURLを使わず、検索で実際に参照されたページ（groundingChunks）だけを使う。
 * AIは存在しないURLをもっともらしく作ってしまうことがあるため。
 * 検索が使えない場合（無料枠など）は、AIの料理案に各サイトの検索結果へのリンクを付ける。
 *
 * APIキーはユーザー自身がこの端末のブラウザ内にのみ保存し、サーバーを介さず直接リクエストする。
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const RECIPE_COUNT = 6
const MAX_LINKS_PER_RECIPE = 2

export class SearchError extends Error {}

export interface RecipeSearchResult {
  recipes: RecipeSuggestion[]
  /** Google が返す検索候補の表示用HTML。グラウンディング結果と一緒に表示する */
  searchSuggestionsHtml: string | null
  /** Google検索で実在のページを探せたか（false ならAIの料理案＋サイト内検索リンク） */
  grounded: boolean
}

/** キーがなくても使える、各レシピサイトの検索ページ */
export const RECIPE_SITES = [
  { name: 'クックパッド', host: 'cookpad.com', url: (q: string) => `https://cookpad.com/jp/search/${encodeURIComponent(q)}` },
  { name: 'クラシル', host: 'kurashiru.com', url: (q: string) => `https://www.kurashiru.com/search?query=${encodeURIComponent(q)}` },
  { name: 'DELISH KITCHEN', host: 'delishkitchen.tv', url: (q: string) => `https://delishkitchen.tv/search?q=${encodeURIComponent(q)}` },
  { name: '楽天レシピ', host: 'recipe.rakuten.co.jp', url: (q: string) => `https://recipe.rakuten.co.jp/search/${encodeURIComponent(q)}/` },
  { name: 'Nadia', host: 'oceans-nadia.com', url: (q: string) => `https://oceans-nadia.com/search?q=${encodeURIComponent(q)}` },
]

const KIND_KEYWORD: Record<MealKind, string> = { main: '主菜', side: '副菜', soup: '汁物' }

/** サイト内検索に渡すキーワード。種類が1つだけ選ばれていれば、それも加える */
export function siteQuery(ingredients: string[], kinds: MealKind[]): string {
  const words = [...ingredients]
  if (kinds.length === 1) words.push(KIND_KEYWORD[kinds[0]])
  return words.join(' ')
}

/** 出典が見つからなかったレシピ用に、掲載サイト内（不明ならGoogle）で料理名を検索するリンク */
function fallbackLink(name: string, site: string): RecipeLink {
  const known = site
    ? RECIPE_SITES.find((s) => site.includes(s.name) || s.name.includes(site) || site.toLowerCase().includes(s.host))
    : undefined
  if (known) return { url: known.url(name), title: `${known.name}で「${name}」を検索`, isSearch: true }
  const q = `${name} ${site} レシピ`.trim()
  return { url: `https://www.google.com/search?q=${encodeURIComponent(q)}`, title: `「${name}」をGoogleで検索`, isSearch: true }
}

function buildPrompt(ingredients: string[], kinds: MealKind[], withSearch: boolean): string {
  const kindText =
    kinds.length === 0
      ? '種類は問いません（メインのおかず・副菜・汁物のどれでも可）。'
      : `料理の種類: ${kinds.map((k) => MEAL_LABEL[k]).join('、')}`
  const task = withSearch
    ? [
        '次の食材を使う家庭料理のレシピを、Google検索で日本のレシピサイト',
        '（クックパッド、クラシル、DELISH KITCHEN、楽天レシピ、Nadia、白ごはん.com、みんなのきょうの料理 など）から探してください。',
      ]
    : ['次の食材を使う、日本の家庭でよく作られる料理を提案してください。']
  const pick = withSearch
    ? `検索で実際に見つかったレシピを${RECIPE_COUNT}件、できるだけ異なる複数のサイトから選んでください。`
    : `${RECIPE_COUNT}件提案してください。掲載サイト名には、その料理が載っていそうなサイトを` +
      '「クックパッド」「クラシル」「DELISH KITCHEN」「楽天レシピ」「Nadia」から1つ選び、なるべくばらけさせてください。'
  return [
    ...task,
    `使う食材: ${ingredients.join('、')}`,
    kindText,
    pick,
    '出力は次の形式の行だけにしてください。前置き・見出し・URL・箇条書き記号・補足は書かないでください。',
    'RECIPE|料理名|種類（メイン／副菜／汁物 のどれか）|掲載サイト名|料理のひとこと紹介（40字以内）',
  ].join('\n')
}

interface GroundingChunk { web?: { uri?: string; title?: string } }
interface GroundingSupport { segment?: { text?: string }; groundingChunkIndices?: number[] }

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** 応答テキストから RECIPE 行を取り出し、各行に対応する出典ページを紐付ける */
function parseRecipes(
  text: string,
  chunks: GroundingChunk[],
  supports: GroundingSupport[],
): RecipeSuggestion[] {
  // groundingSupports は「応答のこの部分は、このページを根拠にした」という対応表。
  // 位置はバイト単位で日本語だとずれるため、テキストそのもので応答内の位置を探す。
  const ranges = supports.flatMap((s) => {
    const t = s.segment?.text
    if (!t) return []
    const start = text.indexOf(t)
    if (start < 0) return []
    return [{ start, end: start + t.length, chunkIndices: s.groundingChunkIndices ?? [] }]
  })

  const recipes: RecipeSuggestion[] = []
  let offset = 0
  for (const line of text.split('\n')) {
    const lineStart = offset
    const lineEnd = offset + line.length
    offset = lineEnd + 1

    const m = line.match(/RECIPE\s*\|(.*)$/)
    if (!m) continue
    const fields = m[1].split('|').map((f) => f.trim())
    if (fields.length < 3 || !fields[0]) continue
    const [name, kind, site, ...rest] = fields
    const description = rest.join('｜')

    const links: RecipeLink[] = []
    const seen = new Set<string>()
    for (const r of ranges) {
      if (r.start >= lineEnd || r.end <= lineStart) continue
      for (const i of r.chunkIndices) {
        const uri = chunks[i]?.web?.uri
        if (!uri || !/^https?:\/\//.test(uri) || seen.has(uri)) continue
        seen.add(uri)
        links.push({ url: uri, title: chunks[i]?.web?.title || hostnameOf(uri) })
      }
    }

    recipes.push({
      name,
      kind: kind ?? '',
      site: site ?? '',
      description,
      links: links.length > 0 ? links.slice(0, MAX_LINKS_PER_RECIPE) : [fallbackLink(name, site ?? '')],
    })
  }
  return recipes
}

/**
 * 試す順番。無料枠では Gemini 3 系に Google 検索を組み合わせられない（上限0で429になる）ため、
 * 検索付きの旧モデル → 検索なし の順に自動で切り替える。
 */
const ATTEMPTS: { model: string; withSearch: boolean }[] = [
  { model: 'gemini-3.8-flash', withSearch: true }, // 有料枠ならこれで動く
  { model: 'gemini-2.5-flash', withSearch: true }, // 無料枠でも検索が1日500回まで使える（新規アカウントは使えない場合あり）
  { model: 'gemini-3.8-flash', withSearch: false }, // 無料枠で確実に使える。リンクは各サイトの検索結果
]

type Attempt =
  | { ok: true; data: any }
  | { ok: false; status: number; keyRejected: boolean; message?: string }

async function requestOnce(key: string, model: string, withSearch: boolean, prompt: string): Promise<Attempt> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(withSearch ? { tools: [{ googleSearch: {} }] } : {}),
      }),
    })
  } catch {
    throw new SearchError('通信に失敗しました。インターネット接続を確認してください')
  }
  const data = await res.json().catch(() => null)
  if (res.ok) return { ok: true, data }
  const reasons: string[] = (data?.error?.details ?? []).map((d: { reason?: string }) => d.reason ?? '')
  return {
    ok: false,
    status: res.status,
    keyRejected: reasons.some((r) => r.startsWith('API_KEY')) || res.status === 401,
    message: data?.error?.message,
  }
}

function toError(a: Extract<Attempt, { ok: false }>): SearchError {
  if (a.keyRejected || a.status === 403) {
    return new SearchError('APIキーが正しくないか、権限がありません。「AI検索の設定」を確認してください')
  }
  if (a.status === 429) {
    return new SearchError('無料枠の利用回数の上限に達しました。しばらく（翌日まで）待ってから試してください')
  }
  if (a.status >= 500) {
    return new SearchError('AI側でエラーが発生しました。しばらくしてから試してください')
  }
  return new SearchError(a.message ? `エラーが発生しました：${a.message}` : `エラーが発生しました（${a.status}）`)
}

export async function searchRecipes(
  apiKey: string,
  ingredients: string[],
  kinds: MealKind[],
): Promise<RecipeSearchResult> {
  const key = apiKey.trim()
  if (!key) throw new SearchError('APIキーが設定されていません')

  let last: Extract<Attempt, { ok: false }> | null = null
  for (const { model, withSearch } of ATTEMPTS) {
    const a = await requestOnce(key, model, withSearch, buildPrompt(ingredients, kinds, withSearch))
    if (!a.ok) {
      if (a.keyRejected) throw toError(a) // キー自体が無効なら、他を試しても無駄
      last = a
      continue
    }

    const candidate = a.data?.candidates?.[0]
    if (!candidate) {
      throw new SearchError('この内容では検索できませんでした。食材を変えて試してください')
    }
    const parts: { text?: string; thought?: boolean }[] = candidate.content?.parts ?? []
    const text = parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('')
    const gm = candidate.groundingMetadata ?? {}

    const recipes = parseRecipes(text, gm.groundingChunks ?? [], gm.groundingSupports ?? [])
    if (recipes.length === 0) {
      throw new SearchError('レシピ案が見つかりませんでした。食材を減らすか、別の食材で試してください')
    }
    return {
      recipes,
      searchSuggestionsHtml: gm.searchEntryPoint?.renderedContent ?? null,
      grounded: withSearch,
    }
  }
  throw toError(last!)
}
