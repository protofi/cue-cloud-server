import ModelImpl, { Models } from "./";
import { Many2OneRelation, Many2ManyRelation } from "../Relation";

export default class Sensor extends ModelImpl {

    hasSecureData = true

    static readonly f = {
        ID          : 'id',
        NAME        : 'name',
        LOCATION    : 'location',
        VIBRATION   : 'vibration',
        ICON        : 'icon_string',
        BAT_LEVEL   : 'battery_level',
        SIG_STRENGTH: 'signal_strength',
        EVENT       : 'event_has_happened',
        USERS : {
            MUTED   : 'muted'
        }
    }

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.SENSOR, db, snap, id)
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