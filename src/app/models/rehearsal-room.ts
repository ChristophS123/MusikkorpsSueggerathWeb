export interface Chair {
    id: number;
    x: number;
    y: number;
    userId: string;
    userName: string;
}

export interface RehearsalRoom {
    documentID: string;
    name: string;
    width: number;
    height: number;
    chairs: Chair[];
}
