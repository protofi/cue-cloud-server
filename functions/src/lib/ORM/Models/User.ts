import ModelImpl, { Models } from "./";
import { Many2ManyRelation, N2OneRelation } from "./../Relation";

export default class User extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.USER, db, snap, id)
    }

    household(): N2OneRelation
    {
        return this
            .belongsTo(Models.HOUSEHOLD)
            .defineCachableFields([
                'name'
            ])
    }

    sensors(): Many2ManyRelation
    {
        return this
            .belongsToMany(Models.SENSOR)
            .defineCachableFields(null, [
                'muted'
            ])
    }
}