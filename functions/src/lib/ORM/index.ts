import { Household } from "./Models/Household";
import { User } from "./Models/User";

export interface DataORM {
    user(): User
    household(): Household
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