import ModelImpl, { Models } from ".";
import { Many2OneRelation } from "../Relation";

export default class Event extends ModelImpl {

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.EVENT, db, snap, id)
    }

    sensor(): Many2OneRelation
    {
        return this.haveOne(Models.SENSOR)
    }
}