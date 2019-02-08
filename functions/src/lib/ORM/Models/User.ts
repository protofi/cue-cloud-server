import ModelImpl, { Models } from "./"
import { Many2ManyRelation, Many2OneRelation } from "./../Relation"
import CreateUserSensorRelationsCommand from "./../../Command/CreateUserSensorRelationsCommand";
import UpdateCustomClaims from "./../../Command/UpdateCustomClaims";
import UpdateFCMTokenSecureCache from "../../Command/UpdateFCMTokenSecureCache";

export default class User extends ModelImpl {

    static readonly f = {
        ID          : 'id',
        NAME        : 'name',
        EMAIL       : 'email',
        CLAIMS      : {
            _           : 'claims',
            ADMIN       : 'isAdmin',
            SUPER_ADMIN : 'isSuperAdmin'
        },
        FCM_TOKENS  : {
            _       :'FCM_tokens',
            CONTEXT     : {
                _       : 'context',
                ANDROID : 'ANDROID',
                IOS     : 'IOS'
            },
        },
        HOUSEHOLDS : {
            ACCEPTED    : 'accepted',
            ROLE        : 'role'
        }
    }

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.USER, db, snap, id)

        this.actionableFields.set(
            User.f.CLAIMS._, new UpdateCustomClaims()
        )

        this.actionableFields.set(
            Models.SENSOR, new UpdateFCMTokenSecureCache()
        )
    }

    household(): Many2OneRelation
    {
        return this
            .haveOne(Models.HOUSEHOLD)
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
            .haveMany(Models.SENSOR)
            .defineCachableFields([
                User.f.ID,
                User.f.FCM_TOKENS._ + Models.SECURE_SURFIX
            ])
    }
}