import ModelImpl, { Models } from "./"
import { Many2ManyRelation, N2OneRelation } from "./../Relation"
import CreateUserSensorRelationsCommand from "./../../Command/CreateUserSensorRelationsCommand";
import UpdateCustomClaims from "./../../Command/UpdateCustomClaims";
import UpdateFCMTokenSecureCache from "../../Command/UpdateFCMTokenSecureCache";

export default class User extends ModelImpl {

    static readonly f = {
        ID          : 'id',
        NAME        : 'name',
        EMAIL       : 'email',
        CLAIMS      : 'claims',
        CONTEXT     : {
            _       : 'context',
            ANDROID : 'ANDROID',
            IOS     : 'IOS'
        },
        FCM_TOKENS  : 'FCM_tokens',
        HOUSEHOLDS : {
            ACCEPTED    : 'accepted',
            ROLE        : 'role'
        }
    }

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.USER, db, snap, id)

        this.actionableFields.set(
            'claims', new UpdateCustomClaims()
        )

        this.actionableFields.set(
            Models.SENSOR, new UpdateFCMTokenSecureCache()
        )
    }

    household(): N2OneRelation
    {
        return this
            .belongsTo(Models.HOUSEHOLD)
            .defineCachableFields([
                User.f.NAME,
                User.f.EMAIL
            ]).defineActionableField(User.f.HOUSEHOLDS.ACCEPTED,
                new CreateUserSensorRelationsCommand()
            )
    }

    sensors(): Many2ManyRelation
    {
        return this
            .belongsToMany(Models.SENSOR)
            .defineCachableFields([
                User.f.ID,
                User.f.FCM_TOKENS + Models.SECURE_SURFIX
            ])
    }
}