import ModelImpl, { Models } from "./";
import RelationImpl, { Many2ManyRelation } from "./../Relation";

export default class User extends ModelImpl {

    constructor(db: any)
    {
        super(Models.USER, db)
    }

    households(): Many2ManyRelation
    {
        return this.belongsToMany(Models.HOUSEHOLD) as Many2ManyRelation
    }
}