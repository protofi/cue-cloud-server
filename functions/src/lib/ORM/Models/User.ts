import ModelImpl, { Models } from "./";
import { Many2ManyRelation, N2OneRelation } from "./../Relation";

export default class User extends ModelImpl {

    constructor(db: any, id?: string)
    {
        super(Models.USER, db, id)
    }

    household(): N2OneRelation
    {
        const rel: N2OneRelation = this.belongsTo(Models.HOUSEHOLD);

        rel.defineCachableFields([
            'name',
            'pivot.role'
        ])

        return rel
    }

    sensors(): Many2ManyRelation
    {
        return this.belongsToMany(Models.SENSOR)
    }
}