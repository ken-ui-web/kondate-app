import type { RecipeDraft } from './types'

/**
 * Google AI Studio（Gemini API）を使ったレシピ自動入力。
 * APIキーはユーザー自身がこの端末のブラウザ内にのみ保存し、直接 generativelanguage.googleapis.com へ
 * リクエストする（サーバーは介さない）。
 */

const MODEL = 'gemini-3.5-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export class AiError extends Error {}

// Gemini の responseSchema は OpenAPI のサブセットで、type は大文字（STRING/OBJECT/ARRAY など）
const RECIPE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    genre: { type: 'STRING', enum: ['wa', 'yo', 'chu', 'other'] },
    mainType: { type: 'STRING', enum: ['meat', 'fish', 'other'] },
    effort: { type: 'STRING', enum: ['easy', 'normal', 'hard'] },
    ingredients: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          qty: { type: 'NUMBER' },
          unit: { type: 'STRING' },
          category: { type: 'STRING', enum: ['veg', 'meatfish', 'other', 'seasoning'] },
        },
        required: ['name', 'qty', 'unit', 'category'],
      },
    },
  },
  required: ['name', 'genre', 'mainType', 'effort', 'ingredients'],
} as const

const CATEGORY_HINT =
  'ジャンルは和食=wa/洋食=yo/中華=chu/その他=other、メイン食材は肉=meat/魚=fish/その他=other、' +
  '手間は簡単=easy/ふつう=normal/手間あり=hard、材料カテゴリは野菜=veg/肉魚=meatfish/その他食品=other/調味料=seasoning ' +
  'のいずれかで答えてください。塩・こしょう・砂糖・醤油など「適量でよい調味料」は qty を 0 にしてください。' +
  '分量が決まる材料は2人分の目安の数値を入れてください。'

interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

async function callGemini(apiKey: string, parts: GeminiPart[]): Promise<RecipeDraft> {
  const key = apiKey.trim()
  if (!key) throw new AiError('設定画面でGoogle AI StudioのAPIキーを入力してください')

  const url = `${API_BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RECIPE_SCHEMA,
        },
      }),
    })
  } catch {
    throw new AiError('通信に失敗しました。インターネット接続を確認してください')
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const msg: string | undefined = data?.error?.message
    if (res.status === 400 || res.status === 403) {
      throw new AiError('APIキーが正しくないか、権限がありません。設定画面を確認してください')
    }
    if (res.status === 429) {
      throw new AiError('リクエストが混み合っています。しばらくしてから試してください')
    }
    if (res.status >= 500) {
      throw new AiError('AI側でエラーが発生しました。しばらくしてから試してください')
    }
    throw new AiError(msg ? `エラーが発生しました：${msg}` : `エラーが発生しました（${res.status}）`)
  }

  if (!data) throw new AiError('レシピを読み取れませんでした')

  if (!data.candidates || data.candidates.length === 0) {
    throw new AiError('この内容には対応できませんでした。別の言い方や写真で試してください')
  }

  const candidate = data.candidates[0]
  if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
    throw new AiError('この内容には対応できませんでした。別の言い方や写真で試してください')
  }

  const text: string | undefined = candidate.content?.parts?.[0]?.text
  if (!text) throw new AiError('レシピを読み取れませんでした')

  try {
    const raw = JSON.parse(text)
    return {
      name: raw.name,
      genre: raw.genre,
      mainType: raw.mainType,
      effort: raw.effort,
      ingredients: raw.ingredients,
    }
  } catch {
    throw new AiError('レシピを読み取れませんでした')
  }
}

/** メニュー名から材料リストなどを自動生成する */
export async function generateRecipeFromName(apiKey: string, dishName: string): Promise<RecipeDraft> {
  return callGemini(apiKey, [{
    text:
      `日本の家庭料理「${dishName}」の2人分のレシピ情報を教えてください。` +
      `一般的でよく使われる材料名（例：たまねぎ、豚こま切れ肉）で答えてください。${CATEGORY_HINT}`,
  }])
}

/** 料理雑誌・レシピ本の写真からメニュー名と材料を読み取る */
export async function generateRecipeFromImage(
  apiKey: string,
  base64: string,
  mediaType: 'image/jpeg' | 'image/png',
): Promise<RecipeDraft> {
  return callGemini(apiKey, [
    { inlineData: { mimeType: mediaType, data: base64 } },
    {
      text:
        '料理雑誌かレシピ本の写真です。写っている料理名と、2人分に換算した材料リストを読み取ってください。' +
        `写真に分量の記載があればそれを2人分に換算し、記載がなければ一般的な目安量にしてください。${CATEGORY_HINT}`,
    },
  ])
}
