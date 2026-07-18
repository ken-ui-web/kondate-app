import { useRef, useState } from 'react'
import type { Settings } from '../lib/types'
import { exportAll, importAll, loadApiKey, saveApiKey, type ExportData } from '../lib/storage'
import Icon from './Icon'

interface Props {
  settings: Settings
  setSettings: React.Dispatch<React.SetStateAction<Settings>>
  onImported: () => void
}

export default function SettingsView({ settings, setSettings, onImported }: Props) {
  const [newStaple, setNewStaple] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [apiKey, setApiKey] = useState(loadApiKey)
  const [showKey, setShowKey] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const commitApiKey = () => {
    saveApiKey(apiKey.trim())
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1500)
  }

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
      <div className="section-title">
        <Icon name="users" size={14} />家族の人数
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'center', gap: 20 }}>
          <button className="cal-nav" onClick={() => bumpServings(-1)}>
            <Icon name="minus" size={16} />
          </button>
          <span className="dish-name" style={{ fontSize: 26, minWidth: 92, textAlign: 'center' }}>
            {settings.servings}<span style={{ fontSize: 15 }}>人分</span>
          </span>
          <button className="cal-nav" onClick={() => bumpServings(1)}>
            <Icon name="plus" size={16} />
          </button>
        </div>
        <p className="hint" style={{ textAlign: 'center', marginBottom: 0 }}>
          買い物リストの分量計算に使います
        </p>
      </div>

      <div className="section-title">
        <Icon name="jar" size={14} />常備品（買い物リストに載せないもの）
      </div>
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

      <div className="section-title">
        <Icon name="key" size={14} />AIによる自動入力（任意）
      </div>
      <div className="card">
        <p className="hint" style={{ marginTop: 0 }}>
          レシピ登録時に「メニュー名から材料を自動入力」「写真からレシピを読み取る」を使うには、
          ご自身のGoogle AI Studio（Gemini）のAPIキーが必要です。無料枠がありますが、使いすぎると課金される場合があります。
        </p>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Google AI Studio APIキー</label>
          <div className="row">
            <input
              className="input grow"
              type={showKey ? 'text' : 'password'}
              placeholder="AIzaSy... など"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={commitApiKey}
              autoComplete="off"
              spellCheck={false}
            />
            <button className="icon-btn" onClick={() => setShowKey((v) => !v)}>
              <Icon name={showKey ? 'eye-off' : 'eye'} size={15} />
            </button>
          </div>
        </div>
        {savedFlash && (
          <p className="hint" style={{ color: 'var(--ok)', marginBottom: 0 }}>保存しました</p>
        )}
        <p className="hint" style={{ marginBottom: 0 }}>
          キーは aistudio.google.com/apikey で発行できます。この端末のブラウザ内にのみ保存され、
          バックアップファイルには含まれません。他の人には共有されません。
        </p>
      </div>

      <div className="section-title">
        <Icon name="archive" size={14} />データのバックアップ
      </div>
      <div className="card">
        <p className="hint" style={{ marginTop: 0 }}>
          データはこの端末（ブラウザ）の中に保存されています。
          機種変更やブラウザの履歴削除に備えて、ときどきバックアップを保存しておくと安心です。
        </p>
        <div className="row">
          <button className="btn ghost grow" onClick={doExport}>
            <Icon name="download" size={15} />保存する
          </button>
          <button className="btn ghost grow" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} />読み込む
          </button>
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
        献立管理アプリ v1.0
      </p>
    </div>
  )
}
