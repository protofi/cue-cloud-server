import ModelImpl, { Models } from ".";
import RelationImpl, { Many2ManyRelation, One2ManyRelation, N2OneRelation } from "../Relation";

export default class Event extends ModelImpl {

    constructor(db: any)
    {
        super(Models.EVENT, db)
    }

    sensor(): N2OneRelation
    {
        return this.belongsTo(Models.SENSOR) as N2OneRelation
    }
}