import { CUSTOM_EVENT_ID, FUTURE_EVENTS } from './data'
import type { SetlistPrediction } from './types'

const EVENT_ID_SET = new Set(FUTURE_EVENTS.map((event) => event.id))

export function parsePredictionFromParams(
  params: URLSearchParams,
): SetlistPrediction {
  const requestedEventId = params.get('eventId') ?? CUSTOM_EVENT_ID
  const eventId = EVENT_ID_SET.has(requestedEventId)
    ? requestedEventId
    : CUSTOM_EVENT_ID
  const fallbackEvent = FUTURE_EVENTS.find((event) => event.id === eventId)

  const songIds = (params.get('songs') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  const encoreValue = Number(params.get('encoreAfter'))
  const encoreAfter =
    Number.isInteger(encoreValue) &&
    encoreValue >= 0 &&
    encoreValue < songIds.length
      ? encoreValue
      : null

  return {
    event: {
      id: eventId,
      name:
        params.get('eventName')?.trim() ||
        fallbackEvent?.name ||
        '',
    },
    songIds,
    encoreAfter,
  }
}

export function serializePredictionToParams(
  prediction: SetlistPrediction,
): URLSearchParams {
  const params = new URLSearchParams()

  params.set('eventId', prediction.event.id)

  const eventName = prediction.event.name.trim()

  if (
    eventName &&
    (prediction.event.id === CUSTOM_EVENT_ID ||
      !EVENT_ID_SET.has(prediction.event.id))
  ) {
    params.set('eventName', eventName)
  }

  if (prediction.songIds.length > 0) {
    params.set('songs', prediction.songIds.join(','))
  }

  if (prediction.encoreAfter !== null) {
    params.set('encoreAfter', String(prediction.encoreAfter))
  }

  return params
}
