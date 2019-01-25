import ModelImpl, { Models } from "./";
import { N2OneRelation, One2ManyRelation, Many2ManyRelation } from "../Relation";
import SensorsOnCreate from "./../../Command/SensorsOnCreate";

export default class Sensor extends ModelImpl {

    hasSecureData = true

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.SENSOR, db, snap, id)
        this.addOnCreateAction(new SensorsOnCreate())
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