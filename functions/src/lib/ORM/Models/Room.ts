import ModelImpl, { Models } from "./";
import { One2ManyRelation } from "../Relation";

export default class Room extends ModelImpl {

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.ROOM, db, snap, id)
    }

    sensors(): One2ManyRelation
    {
        return this.hasMany(Models.SENSOR)
    }
}