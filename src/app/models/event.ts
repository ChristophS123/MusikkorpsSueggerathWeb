export interface Event {
    documentID:string;
    name:string
    day:Number;
    month:Number;
    year:Number;
    time:string;
    promised:string[];
    cancelled:string[];
    training:boolean;
    eventCancelled:boolean;
}