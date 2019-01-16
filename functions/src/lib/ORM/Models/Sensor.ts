import ModelImpl, { Models } from "./";
import { N2OneRelation, One2ManyRelation, Many2ManyRelation } from "../Relation";
import SensorsOnCreate from "./../../Command/SensorsOnCreate";
import SensorsOnDelete from "./../../Command/SensorsOnDelete";

export default class Sensor extends ModelImpl {

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.SENSOR, db, snap, id)
        this.addOnCreateAction(new SensorsOnCreate())
        this.addOnDeleteAction(new SensorsOnDelete())
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
                'muted',
                `muted${Models.SECURE_SURFIX}`
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