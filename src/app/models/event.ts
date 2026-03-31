import { RehearsalPiece } from './rehearsal-piece';

export interface Event {
    documentID:string;
    name:string
    day:number;
    month:number;
    year:number;
    time:string;
    promised:string[];
    cancelled:string[];
    maby:string[];
    pieces:RehearsalPiece[];
    training:boolean;
    eventCancelled:boolean;
}