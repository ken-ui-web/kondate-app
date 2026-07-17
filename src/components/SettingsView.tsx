import { useRef, useState } from 'react'
import type { Settings } from '../lib/types'
import { exportAll, importAll, type ExportData } from '../lib/storage'

interface Props {
  settings: Settings
  setSettings: React.Dispatch<React.SetStateAction<Settings>>
  onImported: () => void
}

export default function SettingsView({ settings, setSettings, onImported }: Props) {
  const [newStaple, setNewStaple] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const bumpServings = (delta: number) => {
    setSettings((prev) => ({ ...prev, servings: Math.min(8, Math.max(1, prev.servings + delta)) }))
  }

  const addStaple = () => {
    const s = newStaple.trim()
    setNewStaple('')
    if (!s) return
    setSettings((prev) =>
      prev.staples.includes(s) ? prev : { ...prev, staples: [...prev.staples, s] },
    )
  }

  const removeStaple = (s: string) => {
    setSettings((prev) => ({ ...prev, staples: prev.staples.filter((x) => x !== s) }))
  }

  const doExport = () => {
    const data = exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kondate-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportData
      if (!confirm('今のデータをバックアップの内容で置き換えます。よろしいですか？')) return
      importAll(data)
      onImported()
      alert('読み込みました！')
    } catch (e) {
      alert(`読み込めませんでした：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div>
      <div className="section-title">👨‍👩‍👧 家族の人数</div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'center', gap: 20 }}>
          <button className="cal-nav" onClick={() => bumpServings(-1)}>−</button>
          <span style={{ fontSize: 28, fontWeight: 800, minWidth: 80, textAlign: 'center' }}>
            {settings.servings}人分
          </span>
          <button className="cal-nav" onClick={() => bumpServings(1)}>＋</button>
        </div>
        <p className="hint" style={{ textAlign: 'center', marginBottom: 0 }}>
          買い物リストの分量計算に使います
        </p>
      </div>

      <div className="section-title">🧂 常備品（買い物リストに載せないもの）</div>
      <div className="card">
        <div className="tag-list" style={{ marginTop: 0 }}>
          {settings.staples.map((s) => (
            <span key={s} className="chip plain" onClick={() => removeStaple(s)} style={{ cursor: 'pointer' }}>
              {s} ✕
            </span>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <input
            className="input grow"
            placeholder="例：ポン酢"
            value={newStaple}
            onChange={(e) => setNewStaple(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStaple()}
          />
          <button className="btn small" onClick={addStaple}>追加</button>
        </div>
        <p className="hint" style={{ marginBottom: 0 }}>タップで削除できます</p>
      </div>

      <div className="section-title">💾 データのバックアップ</div>
      <div className="card">
        <p className="hint" style={{ marginTop: 0 }}>
          データはこの端末（ブラウザ）の中に保存されています。
          機種変更やブラウザの履歴削除に備えて、ときどきバックアップを保存しておくと安心です。
        </p>
        <div className="row">
          <button className="btn ghost grow" onClick={doExport}>⬇️ 保存する</button>
          <button className="btn ghost grow" onClick={() => fileRef.current?.click()}>⬆️ 読み込む</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ''
          }}
        />
      </div>

      <p className="hint" style={{ textAlign: 'center', marginTop: 20 }}>
        こんだて帖 v1.0
      </p>
    </div>
  )
}
