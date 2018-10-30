import ModelImpl, { Models } from "./";
import { One2ManyRelation } from "./../Relation";

export default class Household extends ModelImpl {

    constructor(db: any, id?: string)
    {
        super(Models.HOUSEHOLD, db, id)
    }

    users(): One2ManyRelation
    {
        return this.hasMany(Models.USER)
    }
}