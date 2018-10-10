import ModelImpl, { Models } from "./";
import RelationImpl, { Many2ManyRelation } from "./../Relation";

export default class Household extends ModelImpl {

    constructor(db: any)
    {
        super(Models.HOUSEHOLD, db)
    }

    users(): Many2ManyRelation
    {
        return this.belongsToMany(Models.USER) as Many2ManyRelation
    }
}