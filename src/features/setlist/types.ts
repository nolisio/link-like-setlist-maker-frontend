export type LoveLiveSeries =
  | "μ's"
  | 'Aqours'
  | '虹ヶ咲'
  | 'Liella!'
  | '蓮ノ空'
  | 'その他'

export type Song = {
  id: string
  title: string
  titleJa?: string | null
  series: LoveLiveSeries
  unit: string
  unitId?: string
  tags: string[]
  releaseDate?: string | null
  sortOrder?: number
}

export type FutureEvent = {
  id: string
  name: string
  date: string
  venue: string
  series: LoveLiveSeries | '合同'
}

export type SetlistPrediction = {
  event: {
    id: string
    name: string
  }
  songIds: string[]
  encoreAfter: number | null
}
