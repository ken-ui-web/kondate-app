const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.85

export interface EncodedImage {
  base64: string
  mediaType: 'image/jpeg'
}

/** 画像ファイルを長辺1024pxに収まるようリサイズし、JPEGのbase64にする（APIコストと通信量の削減） */
export function fileToResizedJpeg(file: File): Promise<EncodedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width <= 0 || height <= 0) {
        reject(new Error('画像を読み込めませんでした'))
        return
      }
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('画像を処理できませんでした'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      const base64 = dataUrl.split(',')[1]
      if (!base64) {
        reject(new Error('画像を処理できませんでした'))
        return
      }
      resolve({ base64, mediaType: 'image/jpeg' })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像を読み込めませんでした'))
    }
    img.src = url
  })
}
