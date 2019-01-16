import ModelImpl, { Models } from "./"
import { Many2ManyRelation, N2OneRelation } from "./../Relation"
import CreateUserSensorRelationsCommand from "./../../Command/CreateUserSensorRelationsCommand";
import UpdateCustomClaims from "./../../Command/UpdateCustomClaims";

export default class User extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.USER, db, snap, id)

        this.actionableFields.set(
            'claims', new UpdateCustomClaims()
        )
    }

    household(): N2OneRelation
    {
        return this
            .belongsTo(Models.HOUSEHOLD)
            .defineCachableFields([
                'name',
                'email'
            ]).defineActionableField('accepted',
                new CreateUserSensorRelationsCommand()
            )
    }

    sensors(): Many2ManyRelation
    {
        return this
            .belongsToMany(Models.SENSOR)
            .defineCachableFields([
                'id',
                `FCM_tokens${Models.SECURE_SURFIX}`
            ])
    }
}