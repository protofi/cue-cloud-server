import ModelImpl, { Models } from "./";
import { One2ManyRelation, Many2ManyRelation } from "./../Relation";

export default class Household extends ModelImpl {

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.HOUSEHOLD, db, snap, id)
    }

    users(): One2ManyRelation
    {
        return this.hasMany(Models.USER)
    }

    sensors(): Many2ManyRelation
    {
        return this.belongsToMany(Models.SENSOR)
    }
}