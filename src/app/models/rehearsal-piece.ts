export interface RehearsalPiece {
  name:string;
  description:string;
}

export function normalizeRehearsalPieces(value:unknown, sortAlphabetically:boolean = false): RehearsalPiece[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniquePieces = new Map<string, RehearsalPiece>();

  for (const entry of value) {
    const normalizedPiece = normalizeRehearsalPiece(entry);
    if (!normalizedPiece) {
      continue;
    }

    const comparisonKey = getRehearsalPieceComparisonKey(normalizedPiece.name);
    if (!uniquePieces.has(comparisonKey)) {
      uniquePieces.set(comparisonKey, normalizedPiece);
    }
  }

  const normalizedPieces = [...uniquePieces.values()];
  if (sortAlphabetically) {
    normalizedPieces.sort((firstPiece, secondPiece) => firstPiece.name.localeCompare(secondPiece.name, 'de'));
  }

  return normalizedPieces;
}

export function normalizeRehearsalPiece(value:unknown): RehearsalPiece | null {
  if (typeof value === 'string') {
    const normalizedName = normalizeRehearsalPieceName(value);
    if (normalizedName.length === 0) {
      return null;
    }

    return {
      name: normalizedName,
      description: ''
    };
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const pieceModel = value as Record<string, unknown>;
  const normalizedName = normalizeRehearsalPieceName(pieceModel['name'] ?? pieceModel['title'] ?? '');
  if (normalizedName.length === 0) {
    return null;
  }

  return {
    name: normalizedName,
    description: normalizeRehearsalPieceDescription(pieceModel['description'] ?? pieceModel['note'] ?? pieceModel['notes'] ?? '')
  };
}

export function normalizeRehearsalPieceName(value:unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizeRehearsalPieceDescription(value:unknown): string {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, index, lines) => line.length > 0 || (index > 0 && index < lines.length - 1))
    .join('\n')
    .trim();
}

export function getRehearsalPieceComparisonKey(pieceName:string): string {
  return normalizeRehearsalPieceName(pieceName).toLocaleLowerCase('de');
}