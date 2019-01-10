import ModelImpl, { Models } from "./";
import { N2OneRelation, One2ManyRelation, Many2ManyRelation } from "../Relation";

export default class Sensor extends ModelImpl {

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.SENSOR, db, snap, id)
    }

    room(): N2OneRelation
    {
        return this.belongsTo(Models.ROOM)
    }

    events(): One2ManyRelation
    {
        return this.hasMany(Models.EVENT)
    }

    users(): Many2ManyRelation
    {
        return this
            .belongsToMany(Models.USER)
            .defineCachableFields(null, [
                'muted'
            ])
    }

    household(): N2OneRelation
    {
        return this.belongsTo(Models.HOUSEHOLD)
            .defineCachableFields([
                'name'
            ])
    }
}