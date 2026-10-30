import type { Sector, SectorKind } from '../types'

interface SectorDef {
  kind: SectorKind
  label: string
  value: number
  multiplier?: number
  color: string
  textColor?: string
  hint: string
}

const LIGHT = '#ffffff'
const DARK = '#1a1033'

const defs: SectorDef[] = [
  { kind: 'points', label: '100', value: 100, color: '#f97316', hint: '100 очков за каждую букву' },
  { kind: 'bankrupt', label: 'БАНКРОТ', value: 0, color: '#111827', hint: 'Теряешь очки тура, ход переходит' },
  { kind: 'points', label: '300', value: 300, color: '#2563eb', hint: '300 очков за каждую букву' },
  { kind: 'prize', label: 'ПРИЗ', value: 300, color: '#db2777', hint: 'Играем на приз: 300 очков за букву' },
  { kind: 'points', label: '500', value: 500, color: '#16a34a', hint: '500 очков за каждую букву' },
  { kind: 'zero', label: 'НОЛЬ', value: 0, color: '#64748b', hint: 'Ход переходит к следующему' },
  { kind: 'points', label: '200', value: 200, color: '#eab308', textColor: DARK, hint: '200 очков за каждую букву' },
  { kind: 'plus', label: 'ПЛЮС', value: 0, color: '#0d9488', hint: 'Открой любую букву на табло' },
  { kind: 'points', label: '700', value: 700, color: '#9333ea', hint: '700 очков за каждую букву' },
  { kind: 'double', label: '×2', value: 250, multiplier: 2, color: '#dc2626', hint: 'Удвоение: 500 очков за каждую букву' },
  { kind: 'points', label: '150', value: 150, color: '#0ea5e9', textColor: DARK, hint: '150 очков за каждую букву' },
  { kind: 'bankrupt', label: 'БАНКРОТ', value: 0, color: '#111827', hint: 'Теряешь очки тура, ход переходит' },
  { kind: 'points', label: '400', value: 400, color: '#f97316', hint: '400 очков за каждую букву' },
  { kind: 'key', label: 'КЛЮЧ', value: 100, color: '#ca8a04', textColor: DARK, hint: '+500 очков и ключ от шкатулки' },
  { kind: 'points', label: '900', value: 900, color: '#2563eb', hint: '900 очков за каждую букву' },
  { kind: 'points', label: '250', value: 250, color: '#16a34a', hint: '250 очков за каждую букву' },
  { kind: 'luck', label: 'УДАЧА', value: 200, color: '#c026d3', hint: 'Случайный бонус очков' },
  { kind: 'points', label: '600', value: 600, color: '#eab308', textColor: DARK, hint: '600 очков за каждую букву' },
  { kind: 'points', label: '800', value: 800, color: '#0284c7', hint: '800 очков за каждую букву' },
  { kind: 'points', label: '350', value: 350, color: '#7c3aed', hint: '350 очков за каждую букву' },
  { kind: 'points', label: '1000', value: 1000, color: '#f8fafc', textColor: DARK, hint: '1000 очков за каждую букву' },
]

export const SECTORS: readonly Sector[] = defs.map((d, id) => ({
  id,
  kind: d.kind,
  label: d.label,
  value: d.value,
  multiplier: d.multiplier ?? 1,
  color: d.color,
  textColor: d.textColor ?? LIGHT,
  hint: d.hint,
}))

/** Очки, начисляемые сразу при попадании на сектор «Ключ» */
export const KEY_BONUS = 500
/** Возможные бонусы сектора «Удача» */
export const LUCK_BONUSES: readonly number[] = [100, 200, 300, 500, 750, 1000]
