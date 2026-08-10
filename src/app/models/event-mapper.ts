import { Event } from './event';
import {
  createEmptyResponses,
  getLegacyResponseArrays,
  normalizeResponseOptions,
  normalizeResponses
} from './event-response-option';
import { normalizeRehearsalPieces } from './rehearsal-piece';

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => String(entry)).filter((entry) => entry.length > 0);
}

export function mapEventFromFirestore(eventModel: Record<string, unknown>, fallbackId: string = ''): Event {
  const training = Boolean(eventModel['training']);
  const promised = toStringArray(eventModel['promised']);
  const cancelled = toStringArray(eventModel['cancelled']);
  const maby = toStringArray(eventModel['maby']);

  const responseOptions = training
    ? []
    : normalizeResponseOptions(eventModel['responseOptions']);
  const responses = training
    ? {}
    : normalizeResponses(eventModel['responses'], responseOptions, promised, cancelled, maby);
  const legacyResponses = training
    ? { promised, cancelled, maby }
    : getLegacyResponseArrays(responses);

  return {
    documentID: String(eventModel['documentID'] ?? fallbackId),
    name: String(eventModel['name'] ?? ''),
    day: Number(eventModel['day'] ?? 0),
    month: Number(eventModel['month'] ?? 0),
    year: Number(eventModel['year'] ?? 0),
    time: String(eventModel['time'] ?? ''),
    meetingTime: String(eventModel['meetingTime'] ?? ''),
    meetingLocation: String(eventModel['meetingLocation'] ?? ''),
    promised: legacyResponses.promised,
    cancelled: legacyResponses.cancelled,
    maby: legacyResponses.maby,
    responseOptions,
    responses: training ? createEmptyResponses([]) : responses,
    pieces: normalizeRehearsalPieces(eventModel['pieces']),
    training,
    eventCancelled: Boolean(eventModel['eventCancelled'])
  };
}
