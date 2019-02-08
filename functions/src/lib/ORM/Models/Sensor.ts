import ModelImpl, { Models } from "./";
import { Many2OneRelation, One2ManyRelation, Many2ManyRelation } from "../Relation";

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

    room(): Many2OneRelation
    {
        return this.haveOne(Models.ROOM)
    }

    events(): One2ManyRelation
    {
        return this.hasMany(Models.EVENT)
    }

    users(): Many2ManyRelation
    {
        return this
            .haveMany(Models.USER)
            .defineCachableFields(null, [
                Sensor.f.USERS.MUTED,
                Sensor.f.USERS.MUTED + Models.SECURE_SURFIX
            ])
    }

    household(): Many2OneRelation
    {
        return this.haveOne(Models.HOUSEHOLD)
            .defineCachableFields([
                Sensor.f.NAME
            ])
    }
}