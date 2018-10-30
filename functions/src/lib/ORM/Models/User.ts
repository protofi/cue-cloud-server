import ModelImpl, { Models } from "./";
import { Many2ManyRelation, N2OneRelation } from "./../Relation";

export default class User extends ModelImpl {

    constructor(db: any, id?: string)
    {
        super(Models.USER, db, id)
    }

    household(): N2OneRelation
    {
        const r: N2OneRelation = this.belongsTo(Models.HOUSEHOLD);

        // this.defineCache(r, [
        //     'name',
        //     `${Models.HOUSEHOLD}/{id}/role`
        // ])

        return r
    }

    sensors(): Many2ManyRelation
    {
        return this.belongsToMany(Models.SENSOR)
    }


}