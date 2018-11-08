import ModelImpl, { Models } from "./";
import { One2ManyRelation } from "../Relation";

export default class Room extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore)
    {
        super(Models.ROOM, db)
    }

    sensors(): One2ManyRelation
    {
        return this.hasMany(Models.SENSOR)
    }
}