import ModelImpl, { Models, User, Household } from "./Model";

export interface DataORM {
    user(): ModelImpl
    household(): ModelImpl
}

export default class DataORMImpl implements DataORM{
    private db: any

    constructor(db: any)
    {
        this.db = db
    }

    user(): User
    {
        return new User(this.db) as User
    }

    household(): Household
    {
        return new Household(this.db) as Household
    }
}