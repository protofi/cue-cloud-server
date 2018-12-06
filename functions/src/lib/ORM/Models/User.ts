import ModelImpl, { Models } from "./"
import { Many2ManyRelation, N2OneRelation } from "./../Relation"
import CreateUserSensorRelationsCommand from "./../../Command/CreateUserSensorRelationsCommand";

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
            ]).defineActionableField('accepted',
                    new CreateUserSensorRelationsCommand())
    }

    sensors(): Many2ManyRelation
    {
        return this
            .belongsToMany(Models.SENSOR)
            .defineCachableFields([
                'id'
            ])
    }
}