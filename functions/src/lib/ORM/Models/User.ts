import ModelImpl, { Models } from "./";
import { Many2ManyRelation, N2OneRelation } from "./../Relation";

export default class User extends ModelImpl {

    constructor(db: any, id?: string)
    {
        super(Models.USER, db, id)
    }

    households(): N2OneRelation
    {
        return this.belongsTo(Models.HOUSEHOLD)
    }

    sensors(): Many2ManyRelation
    {
        return this.belongsToMany(Models.SENSOR)
    }
}