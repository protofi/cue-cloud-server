import ModelImpl, { Models } from ".";
import { N2OneRelation } from "../Relation";

export default class Event extends ModelImpl {

    constructor(db: any)
    {
        super(Models.EVENT, db)
    }

    sensor(): N2OneRelation
    {
        return this.belongsTo(Models.SENSOR)
    }
}