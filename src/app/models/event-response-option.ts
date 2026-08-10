export interface EventResponseOption {
  id: string;
  label: string;
  color: string;
}

export type EventResponses = Record<string, string[]>;

export const DEFAULT_RESPONSE_OPTION_IDS = {
  cancelled: 'cancelled',
  maby: 'maby',
  promised: 'promised'
} as const;

export function createDefaultResponseOptions(): EventResponseOption[] {
  return [
    { id: DEFAULT_RESPONSE_OPTION_IDS.cancelled, label: 'Absagen', color: '#c84036' },
    { id: DEFAULT_RESPONSE_OPTION_IDS.maby, label: '?', color: '#d98711' },
    { id: DEFAULT_RESPONSE_OPTION_IDS.promised, label: 'Zusagen', color: '#15925b' }
  ];
}

export function createEmptyResponses(options: EventResponseOption[]): EventResponses {
  const responses: EventResponses = {};
  for (const option of options) {
    responses[option.id] = [];
  }
  return responses;
}

export function createResponseOption(label: string, color: string = '#0a66c2'): EventResponseOption {
  const normalizedLabel = label.trim();
  return {
    id: `custom_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    label: normalizedLabel.length > 0 ? normalizedLabel : 'Neue Option',
    color: normalizeOptionColor(color)
  };
}

export function normalizeOptionColor(color: string): string {
  const trimmedColor = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmedColor)) {
    return trimmedColor.toLowerCase();
  }
  return '#0a66c2';
}

export function normalizeResponseOptions(value: unknown): EventResponseOption[] {
  if (!Array.isArray(value) || value.length === 0) {
    return createDefaultResponseOptions();
  }

  const options: EventResponseOption[] = [];
  const usedIds = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const optionModel = entry as Partial<EventResponseOption>;
    const id = String(optionModel.id ?? '').trim();
    const label = String(optionModel.label ?? '').trim();
    if (id.length === 0 || label.length === 0 || usedIds.has(id)) {
      continue;
    }

    usedIds.add(id);
    options.push({
      id,
      label,
      color: normalizeOptionColor(String(optionModel.color ?? '#0a66c2'))
    });
  }

  return options.length > 0 ? options : createDefaultResponseOptions();
}

export function normalizeResponses(
  value: unknown,
  options: EventResponseOption[],
  promised: string[] = [],
  cancelled: string[] = [],
  maby: string[] = []
): EventResponses {
  const responses = createEmptyResponses(options);
  const optionIds = new Set(options.map((option) => option.id));

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [optionId, userIds] of Object.entries(value as Record<string, unknown>)) {
      if (!optionIds.has(optionId) || !Array.isArray(userIds)) {
        continue;
      }
      responses[optionId] = userIds.map((userId) => String(userId)).filter((userId) => userId.length > 0);
    }
  }

  const hasStoredResponses = Object.values(responses).some((userIds) => userIds.length > 0);
  if (!hasStoredResponses) {
    if (optionIds.has(DEFAULT_RESPONSE_OPTION_IDS.promised)) {
      responses[DEFAULT_RESPONSE_OPTION_IDS.promised] = [...promised];
    }
    if (optionIds.has(DEFAULT_RESPONSE_OPTION_IDS.cancelled)) {
      responses[DEFAULT_RESPONSE_OPTION_IDS.cancelled] = [...cancelled];
    }
    if (optionIds.has(DEFAULT_RESPONSE_OPTION_IDS.maby)) {
      responses[DEFAULT_RESPONSE_OPTION_IDS.maby] = [...maby];
    }
  }

  return responses;
}

export function getLegacyResponseArrays(responses: EventResponses): {
  promised: string[];
  cancelled: string[];
  maby: string[];
} {
  return {
    promised: [...(responses[DEFAULT_RESPONSE_OPTION_IDS.promised] ?? [])],
    cancelled: [...(responses[DEFAULT_RESPONSE_OPTION_IDS.cancelled] ?? [])],
    maby: [...(responses[DEFAULT_RESPONSE_OPTION_IDS.maby] ?? [])]
  };
}

export function getSelectedResponseOptionId(
  responses: EventResponses,
  userId: string
): string | null {
  for (const [optionId, userIds] of Object.entries(responses)) {
    if (userIds.includes(userId)) {
      return optionId;
    }
  }
  return null;
}

export function getResponseOptionById(
  options: EventResponseOption[],
  optionId: string | null
): EventResponseOption | null {
  if (!optionId) {
    return null;
  }
  return options.find((option) => option.id === optionId) ?? null;
}

export function withUserResponse(
  responses: EventResponses,
  options: EventResponseOption[],
  userId: string,
  optionId: string
): EventResponses {
  const nextResponses = createEmptyResponses(options);

  for (const option of options) {
    const existingUsers = responses[option.id] ?? [];
    nextResponses[option.id] = existingUsers.filter((entry) => entry !== userId);
  }

  if (options.some((option) => option.id === optionId)) {
    nextResponses[optionId] = [...nextResponses[optionId], userId];
  }

  return nextResponses;
}

export function getRespondedUserIds(responses: EventResponses): Set<string> {
  const respondedUserIds = new Set<string>();
  for (const userIds of Object.values(responses)) {
    for (const userId of userIds) {
      respondedUserIds.add(userId);
    }
  }
  return respondedUserIds;
}

export function getSoftBackgroundColor(color: string): string {
  const normalizedColor = normalizeOptionColor(color).replace('#', '');
  const red = Number.parseInt(normalizedColor.slice(0, 2), 16);
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, 0.16)`;
}
