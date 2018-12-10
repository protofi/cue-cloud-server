import ModelImpl, { Models } from "./";
import { One2ManyRelation } from "./../Relation";
import { CreateUserNewSensorRelationsCommand } from "../../Command/CreateUserNewSensorRelationsCommand";
import { GrandOneUserHouseholdAdminPrivileges } from "../../Command/GrandOneUserHouseholdAdminPrivileges";

export default class Household extends ModelImpl {

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.HOUSEHOLD, db, snap, id)

        this.addOnCreateAction(
            new GrandOneUserHouseholdAdminPrivileges()
        )
    }

    users(): One2ManyRelation
    {
        return this.hasMany(Models.USER)
    }

    sensors(): One2ManyRelation
    {
        return this.hasMany(Models.SENSOR)
            .defineActionOnUpdate(new CreateUserNewSensorRelationsCommand())
    }
}