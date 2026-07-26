import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { CheckCircle2, Database, Download, HardDrive, Info, Palette, ShieldCheck, TimerReset, Upload } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { downloadBackup, restoreBackup } from '../../storage/backup/backupService'
import { db } from '../../storage/database/db'
import type { AppSettings } from '../../types/domain'

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const counts = useLiveQuery(async () => ({ sessions: await db.sessions.where('status').equals('completed').count(), templates: await db.templates.filter((item) => !item.archivedAt).count(), sets: await db.sets.count() }), [])
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  async function update(patch: Partial<AppSettings>) {
    await db.settings.update('app', patch)
  }

  async function handleRestore(file?: File) {
    if (!file || !window.confirm('Текущие данные будут заменены содержимым резервной копии. Продолжить?')) return
    try {
      await restoreBackup(file)
      setMessage('Резервная копия восстановлена')
    } catch {
      setMessage('Не удалось прочитать файл резервной копии')
    }
  }

  async function requestPersistence() {
    const granted = await navigator.storage?.persist?.()
    setMessage(granted ? 'Постоянное хранилище включено' : 'Браузер не предоставил постоянное хранилище')
  }

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Preferences" title="Настройки" description="Поведение приложения, локальные данные и резервные копии." />
      {message && <div className="settings-message"><CheckCircle2 size={16} />{message}<button onClick={() => setMessage('')}>×</button></div>}
      <div className="settings-layout">
        <div className="settings-main">
          <Card className="settings-card"><div className="settings-card__header"><div className="settings-icon"><TimerReset size={20} /></div><div><h3>Тренировка</h3><p>Единицы измерения и таймер отдыха</p></div></div><div className="settings-rows"><div className="settings-row"><div><strong>Единица веса</strong><span>Используется во всех подходах и графиках</span></div><div className="segmented small"><button className={settings?.weightUnit === 'kg' ? 'active' : ''} onClick={() => update({ weightUnit: 'kg' })}>Килограммы</button><button className={settings?.weightUnit === 'lb' ? 'active' : ''} onClick={() => update({ weightUnit: 'lb' })}>Фунты</button></div></div><div className="settings-row"><div><strong>Отдых по умолчанию</strong><span>Для новых упражнений</span></div><select value={settings?.defaultRestSeconds ?? 90} onChange={(event) => update({ defaultRestSeconds: Number(event.target.value) })}><option value={0}>Отключён</option><option value={30}>30 секунд</option><option value={60}>60 секунд</option><option value={90}>90 секунд</option><option value={120}>120 секунд</option><option value={180}>180 секунд</option></select></div><div className="settings-row"><div><strong>Автозапуск таймера</strong><span>После завершения подхода</span></div><button className={`toggle ${settings?.autoStartTimer ? 'active' : ''}`} onClick={() => update({ autoStartTimer: !settings?.autoStartTimer })}><i /></button></div></div></Card>
          <Card className="settings-card"><div className="settings-card__header"><div className="settings-icon violet"><Palette size={20} /></div><div><h3>Интерфейс</h3><p>Внешний вид и анимации</p></div></div><div className="settings-rows"><div className="settings-row"><div><strong>Тема</strong><span>Forma создана специально для тёмного режима</span></div><span className="setting-value">Midnight</span></div><div className="settings-row"><div><strong>Уменьшить анимации</strong><span>Минимум движения и переходов</span></div><button className={`toggle ${settings?.reducedMotion ? 'active' : ''}`} onClick={() => update({ reducedMotion: !settings?.reducedMotion })}><i /></button></div></div></Card>
          <Card className="settings-card"><div className="settings-card__header"><div className="settings-icon green"><Database size={20} /></div><div><h3>Резервная копия</h3><p>История хранится только на этом устройстве</p></div></div><div className="backup-actions"><button onClick={downloadBackup}><div className="backup-action__icon"><Download size={20} /></div><div><strong>Экспортировать данные</strong><span>Скачать полную копию в формате JSON</span></div></button><button onClick={() => fileInput.current?.click()}><div className="backup-action__icon"><Upload size={20} /></div><div><strong>Восстановить из файла</strong><span>Заменить локальные данные резервной копией</span></div></button><input ref={fileInput} hidden type="file" accept="application/json" onChange={(event) => handleRestore(event.target.files?.[0])} /></div></Card>
        </div>
        <aside className="settings-side">
          <Card className="storage-card"><div className="storage-card__visual"><HardDrive size={24} /><i /></div><span>Локальное хранилище</span><h3>{counts?.sessions ?? 0} тренировок</h3><div className="storage-stats"><div><strong>{counts?.templates ?? 0}</strong><span>шаблонов</span></div><div><strong>{counts?.sets ?? 0}</strong><span>подходов</span></div></div><Button variant="secondary" icon={<ShieldCheck size={16} />} onClick={requestPersistence}>Защитить хранилище</Button></Card>
          <Card className="privacy-card"><ShieldCheck size={21} /><h3>Полная приватность</h3><p>Данные никогда не покидают устройство. Нет аккаунта, облака и аналитики.</p></Card>
          <Card className="about-card"><div><Info size={18} /><strong>Forma</strong><span>Версия 1.0.0</span></div><p>Персональный тренировочный журнал.</p></Card>
        </aside>
      </div>
    </motion.div>
  )
}
