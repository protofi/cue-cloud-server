import Household from "./Models/Household";
import Sensor from "./Models/Sensor";
import Event from "./Models/Event";
import Room from "./Models/Room";
import User from "./Models/User";
import { Pivot } from "./Relation/Pivot";
import { singular } from 'pluralize'
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

    pivot(path: string): Pivot
    {
        let srcParts
        let identifier
        let pivotName
        let pivotId
        let modelNames
        let modelIds

        let modelA
        let modelB

        try{
            srcParts      = path.split('/')
            identifier    = srcParts.slice(srcParts.length-2, srcParts.length)
          
            pivotName     = identifier[0]
            pivotId       = identifier[1]
            
            modelNames    = pivotName.split('_')
            modelIds      = pivotId.split('_')
        }
        catch(e)
        {
            throw(new Error('Path must contain both name and id of pivot collection seperated with a slash'))
        }

        try
        {
            const modelAId = modelNames[0]
            const modelBId = modelNames[1]

            if(!modelAId) throw(new Error())
            if(!modelBId) throw(new Error())

            const modelAName = modelIds[0]
            const modelBName = modelIds[1]

            if(!modelAName) throw(new Error())
            if(!modelBName) throw(new Error())

            modelA        = (this[singular(modelAId)])(null, modelAName)
            modelB        = (this[singular(modelBId)])(null, modelBName)
        }
        catch(e)
        {
            throw(new Error('Name and id of path must contain parts from two collection seperated with an underscore'))
        }

        return new Pivot(this.db, pivotId, modelA, modelB)
    }

    user(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): User
    {
        return new User(this.db, snap, id)
    }

    household(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): Household
    {
        return new Household(this.db, snap, id)
    }

    sensor(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): Sensor
    {
        return new Sensor(this.db, snap, id)
    }

    room(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): Room
    {
        return new Room(this.db, snap, id)
    }

    event(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): Event
    {
        return new Event(this.db, snap, id)
    }
}