import Household from "./Models/Household";
import User from "./Models/User";
import Sensor from "./Models/Sensor";
import Room from "./Models/Room";

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

    sensor(): Sensor
    {
        return new Sensor(this.db)
    }

    room(): Room
    {
        return new Room(this.db)
    }
}