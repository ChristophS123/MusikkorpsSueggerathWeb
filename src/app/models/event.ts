export interface Event {
    documentID:string;
    name:string
    day:number;
    month:number;
    year:number;
    time:string;
    promised:string[];
    cancelled:string[];
    training:boolean;
    eventCancelled:boolean;
}