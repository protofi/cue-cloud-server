import Household from "./Models/Household";
import Sensor from "./Models/Sensor";
import Event from "./Models/Event";
import Room from "./Models/Room";
import User from "./Models/User";
import Pivot from "./Models/Pivot";
import ModelImpl from "./Models";

export interface DataORM {
    user(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): User
    household(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): Household
    batch(): FirebaseFirestore.WriteBatch
}

export default class DataORMImpl implements DataORM{
    private db: FirebaseFirestore.Firestore

    constructor(db: FirebaseFirestore.Firestore)
    {
        this.db = db
    }

    batch(): FirebaseFirestore.WriteBatch
    {
        return this.db.batch()
    }

    user(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): User
    {
        new Pivot(this.db, new ModelImpl('', this.db), new ModelImpl('', this.db))
        return new User(this.db, snap, id)
    }

    household(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): Household
    {
        return new Household(this.db, snap, id)
    }

    sensor(): Sensor
    {
        return new Sensor(this.db)
    }

    room(): Room
    {
        return new Room(this.db)
    }

    event(): Event
    {
        return new Event(this.db)
    }
}