import ModelImp, { Models, User } from "./Model";

export interface DataORM {
    users(): ModelImp
}

export default class DataORMImpl implements DataORM{
    private db: any

    constructor(db: any)
    {
        this.db = db
    }

    users(): ModelImp
    {
        return new User(Models.USER, this.db)
    }
}