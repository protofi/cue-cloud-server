import ModelImpl, { Models } from "./";
import { Many2ManyRelation } from "./../Relation";

export default class Household extends ModelImpl {

    constructor(db: any, id?: string)
    {
        super(Models.HOUSEHOLD, db, id)
    }

    users(): Many2ManyRelation
    {
        return this.belongsToMany(Models.USER)
    }
}