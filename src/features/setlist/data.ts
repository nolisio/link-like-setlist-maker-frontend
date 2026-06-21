import type { FutureEvent, LoveLiveSeries } from './types'

export const LOVE_LIVE_SERIES: LoveLiveSeries[] = [
  "μ's",
  'Aqours',
  '虹ヶ咲',
  'Liella!',
  '蓮ノ空',
  'その他',
]

export const CUSTOM_EVENT_ID = 'custom'

export const FUTURE_EVENTS: FutureEvent[] = [
  {
    id: 'sample-all-stars-2026',
    name: 'ラブライブ！合同ライブ予想（サンプル）',
    date: '2026-09-12',
    venue: '未定',
    series: '合同',
  },
  {
    id: 'sample-hasunosora-2026',
    name: '蓮ノ空 スペシャルライブ予想（サンプル）',
    date: '2026-10-18',
    venue: '未定',
    series: '蓮ノ空',
  },
  {
    id: 'sample-liella-2026',
    name: 'Liella! ツアー予想（サンプル）',
    date: '2026-11-08',
    venue: '未定',
    series: 'Liella!',
  },
]
