interface datastore {
    
}

export default class database implements datastore {
    private db: any;

    constructor(db: any)
    {
        this.db = db
    }
}

