import { RehearsalPiece } from './rehearsal-piece';
import { EventResponseOption, EventResponses } from './event-response-option';

export interface Event {
    documentID:string;
    name:string
    day:number;
    month:number;
    year:number;
    time:string;
    meetingTime:string;
    meetingLocation:string;
    promised:string[];
    cancelled:string[];
    maby:string[];
    responseOptions:EventResponseOption[];
    responses:EventResponses;
    pieces:RehearsalPiece[];
    training:boolean;
    eventCancelled:boolean;
}
