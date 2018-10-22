import ModelImpl, { Models } from "./";
import { Many2ManyRelation } from "./../Relation";

export default class User extends ModelImpl {

    constructor(db: any, id?: string)
    {
        super(Models.USER, db, id)
    }

    households(): Many2ManyRelation
    {
        return this.belongsToMany(Models.HOUSEHOLD)
    }

    sensors(): Many2ManyRelation
    {
        return this.belongsToMany(Models.SENSOR)
    }
}