import ModelImpl, { Models } from ".";
import { N2OneRelation } from "../Relation";

export default class Event extends ModelImpl {

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.EVENT, db, snap, id)
    }

    sensor(): N2OneRelation
    {
        return this.belongsTo(Models.SENSOR)
    }
}