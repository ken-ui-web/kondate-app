import Anthropic from '@anthropic-ai/sdk'
import type { RecipeDraft } from './types'

const MODEL = 'claude-opus-4-8'

export class AiError extends Error {}

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    genre: { type: 'string', enum: ['wa', 'yo', 'chu', 'other'] },
    mainType: { type: 'string', enum: ['meat', 'fish', 'other'] },
    effort: { type: 'string', enum: ['easy', 'normal', 'hard'] },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          qty: { type: 'number' },
          unit: { type: 'string' },
          category: { type: 'string', enum: ['veg', 'meatfish', 'other', 'seasoning'] },
        },
        required: ['name', 'qty', 'unit', 'category'],
        additionalProperties: false,
      },
    },
  },
  required: ['name', 'genre', 'mainType', 'effort', 'ingredients'],
  additionalProperties: false,
} as const

const CATEGORY_HINT =
  'ジャンルは和食=wa/洋食=yo/中華=chu/その他=other、メイン食材は肉=meat/魚=fish/その他=other、' +
  '手間は簡単=easy/ふつう=normal/手間あり=hard、材料カテゴリは野菜=veg/肉魚=meatfish/その他食品=other/調味料=seasoning ' +
  'のいずれかで答えてください。塩・こしょう・砂糖・醤油など「適量でよい調味料」は qty を 0 にしてください。' +
  '分量が決まる材料は2人分の目安の数値を入れてください。'

function client(apiKey: string): Anthropic {
  return new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true })
}

function extractDraft(response: Anthropic.Message): RecipeDraft {
  if (response.stop_reason === 'refusal') {
    throw new AiError('この内容には対応できませんでした。別の言い方や写真で試してください')
  }
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  )
  if (!textBlock) throw new AiError('レシピを読み取れませんでした')
  try {
    const raw = JSON.parse(textBlock.text)
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

function toFriendlyError(e: unknown): AiError {
  if (e instanceof AiError) return e
  if (e instanceof Anthropic.AuthenticationError) {
    return new AiError('APIキーが正しくありません。設定画面を確認してください')
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return new AiError('このAPIキーには権限がありません')
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new AiError('リクエストが混み合っています。しばらくしてから試してください')
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new AiError('通信に失敗しました。インターネット接続を確認してください')
  }
  if (e instanceof Anthropic.APIError) {
    return new AiError(`AIとの通信でエラーが発生しました（${e.message}）`)
  }
  return new AiError('予期しないエラーが発生しました')
}

/** メニュー名から材料リストなどを自動生成する */
export async function generateRecipeFromName(apiKey: string, dishName: string): Promise<RecipeDraft> {
  if (!apiKey.trim()) throw new AiError('設定画面でClaude APIキーを入力してください')
  try {
    const response = await client(apiKey).messages.create({
      model: MODEL,
      max_tokens: 1500,
      output_config: { format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
      messages: [{
        role: 'user',
        content:
          `日本の家庭料理「${dishName}」の2人分のレシピ情報を教えてください。` +
          `一般的でよく使われる材料名（例：たまねぎ、豚こま切れ肉）で答えてください。${CATEGORY_HINT}`,
      }],
    })
    return extractDraft(response)
  } catch (e) {
    throw toFriendlyError(e)
  }
}

/** 料理雑誌・レシピ本の写真からメニュー名と材料を読み取る */
export async function generateRecipeFromImage(
  apiKey: string,
  base64: string,
  mediaType: 'image/jpeg' | 'image/png',
): Promise<RecipeDraft> {
  if (!apiKey.trim()) throw new AiError('設定画面でClaude APIキーを入力してください')
  try {
    const response = await client(apiKey).messages.create({
      model: MODEL,
      max_tokens: 1500,
      output_config: { format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text:
              '料理雑誌かレシピ本の写真です。写っている料理名と、2人分に換算した材料リストを読み取ってください。' +
              `写真に分量の記載があればそれを2人分に換算し、記載がなければ一般的な目安量にしてください。${CATEGORY_HINT}`,
          },
        ],
      }],
    })
    return extractDraft(response)
  } catch (e) {
    throw toFriendlyError(e)
  }
}
