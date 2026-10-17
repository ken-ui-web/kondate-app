import type { MealKind, RecipeLink, RecipeSuggestion } from './types'
import { MEAL_LABEL } from './types'

/**
 * 食材からレシピ案を探す。
 *
 * Gemini API に Google 検索ツール（グラウンディング）を付けて呼び、実在するレシピページを検索させる。
 * リンクはAIが書いたURLを使わず、検索で実際に参照されたページ（groundingChunks）だけを使う。
 * AIは存在しないURLをもっともらしく作ってしまうことがあるため。
 *
 * APIキーはユーザー自身がこの端末のブラウザ内にのみ保存し、サーバーを介さず直接リクエストする。
 */

const MODEL = 'gemini-3.8-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const RECIPE_COUNT = 6
const MAX_LINKS_PER_RECIPE = 2

export class SearchError extends Error {}

export interface RecipeSearchResult {
  recipes: RecipeSuggestion[]
  /** Google が返す検索候補の表示用HTML。グラウンディング結果と一緒に表示する */
  searchSuggestionsHtml: string | null
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
  const known = RECIPE_SITES.find(
    (s) => site.includes(s.name) || s.name.includes(site) || site.toLowerCase().includes(s.host),
  )
  if (known) return { url: known.url(name), title: `${known.name}で「${name}」を検索`, isSearch: true }
  const q = `${name} ${site} レシピ`.trim()
  return { url: `https://www.google.com/search?q=${encodeURIComponent(q)}`, title: `「${name}」をGoogleで検索`, isSearch: true }
}

function buildPrompt(ingredients: string[], kinds: MealKind[]): string {
  const kindText =
    kinds.length === 0
      ? '種類は問いません（メインのおかず・副菜・汁物のどれでも可）。'
      : `料理の種類: ${kinds.map((k) => MEAL_LABEL[k]).join('、')}`
  return [
    '次の食材を使う家庭料理のレシピを、Google検索で日本のレシピサイト',
    '（クックパッド、クラシル、DELISH KITCHEN、楽天レシピ、Nadia、白ごはん.com、みんなのきょうの料理 など）から探してください。',
    `使う食材: ${ingredients.join('、')}`,
    kindText,
    `検索で実際に見つかったレシピを${RECIPE_COUNT}件、できるだけ異なる複数のサイトから選んでください。`,
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

export async function searchRecipes(
  apiKey: string,
  ingredients: string[],
  kinds: MealKind[],
): Promise<RecipeSearchResult> {
  const key = apiKey.trim()
  if (!key) throw new SearchError('APIキーが設定されていません')

  const url = `${API_BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(ingredients, kinds) }] }],
        tools: [{ googleSearch: {} }],
      }),
    })
  } catch {
    throw new SearchError('通信に失敗しました。インターネット接続を確認してください')
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const msg: string | undefined = data?.error?.message
    const reasons: string[] = (data?.error?.details ?? []).map((d: { reason?: string }) => d.reason ?? '')
    const keyRejected = reasons.some((r) => r.startsWith('API_KEY')) || res.status === 401 || res.status === 403
    if (keyRejected) {
      throw new SearchError('APIキーが正しくないか、権限がありません。「AI検索の設定」を確認してください')
    }
    if (res.status === 404) {
      throw new SearchError('AIモデルが見つかりませんでした。時間をおいて試すか、アプリの更新をお待ちください')
    }
    if (res.status === 429) {
      throw new SearchError('利用回数の上限に達したか、混み合っています。しばらくしてから試してください')
    }
    if (res.status >= 500) {
      throw new SearchError('AI側でエラーが発生しました。しばらくしてから試してください')
    }
    throw new SearchError(msg ? `エラーが発生しました：${msg}` : `エラーが発生しました（${res.status}）`)
  }

  const candidate = data?.candidates?.[0]
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
  }
}
