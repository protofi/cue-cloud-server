import ModelImpl, { Models } from "./";
import { N2OneRelation, One2ManyRelation, Many2ManyRelation } from "../Relation";
import { Relations } from "../../const";

export default class Sensor extends ModelImpl {

    hasSecureData = true

    static readonly f = {
        ID          : 'id',
        NAME        : 'name',
        LOCATION    : 'location',
        ICON        : 'icon_string',
        EVENT       : 'event_has_happened',
        USERS : {
            MUTED   : 'muted'
        }
    }

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
                Sensor.f.USERS.MUTED,
                Sensor.f.USERS.MUTED + Models.SECURE_SURFIX
            ])
    }

    household(): N2OneRelation
    {
        return this.belongsTo(Models.HOUSEHOLD)
            .defineCachableFields([
                Sensor.f.NAME
            ])
    }
}