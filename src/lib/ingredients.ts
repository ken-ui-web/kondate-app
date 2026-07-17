/**
 * 食材名の表記ゆれを吸収するための正規化。
 * 冷蔵庫在庫と買い物リスト・レシピ材料の突き合わせに使う。
 */

const SYNONYMS: Record<string, string> = {
  '長ねぎ': 'ねぎ',
  '長ネギ': 'ねぎ',
  '白ねぎ': 'ねぎ',
  '青ねぎ': 'ねぎ',
  '小ねぎ': 'ねぎ',
  '万能ねぎ': 'ねぎ',
  'じゃが芋': 'じゃがいも',
  '馬鈴薯': 'じゃがいも',
  '玉葱': 'たまねぎ',
  '玉ねぎ': 'たまねぎ',
  '人参': 'にんじん',
  '大根': 'だいこん',
  '茄子': 'なす',
  '胡瓜': 'きゅうり',
  '牛蒡': 'ごぼう',
  '南瓜': 'かぼちゃ',
  '生姜': 'しょうが',
  '大蒜': 'にんにく',
  '玉子': 'たまご',
  '卵': 'たまご',
  '鶏卵': 'たまご',
  '豚肉': '豚こま切れ肉',
  'ほうれんそう': 'ほうれん草',
  'キャベツの葉': 'キャベツ',
  '椎茸': 'しいたけ',
  '榎茸': 'えのき',
  '占地': 'しめじ',
  '豆腐': 'とうふ',
  '木綿豆腐': 'とうふ',
  '絹ごし豆腐': 'とうふ',
  '御飯': 'ごはん',
  '米': 'ごはん',
}

/** カタカナ→ひらがな */
function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  )
}

export function normalizeName(raw: string): string {
  let s = raw.normalize('NFKC').trim().toLowerCase()
  s = s.replace(/\s+/g, '')
  if (SYNONYMS[s]) s = SYNONYMS[s]
  const hira = kataToHira(s)
  if (SYNONYMS[hira]) return SYNONYMS[hira]
  return hira
}

/**
 * 在庫名と材料名が「同じもの」とみなせるか。
 * 完全一致、または短い方が3文字以上のときの部分一致
 * （「ねぎ」⊂「たまねぎ」のような誤マッチを避けるため、2文字以下は完全一致のみ）。
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const shorter = na.length <= nb.length ? na : nb
  if (shorter.length >= 3) {
    return na.includes(nb) || nb.includes(na)
  }
  return false
}
