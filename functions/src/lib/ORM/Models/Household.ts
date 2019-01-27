import ModelImpl, { Models } from "./";
import { One2ManyRelation } from "./../Relation";
import CreateUserNewSensorRelationsCommand from "../../Command/CreateUserNewSensorRelationsCommand";
import GrandOneUserHouseholdAdminPrivileges from "../../Command/GrandOneUserHouseholdAdminPrivileges";
import { IModelCommand } from "../../Command";

export default class Household extends ModelImpl {

    private GrandOneUserHouseholdAdminPrivileges: IModelCommand = new GrandOneUserHouseholdAdminPrivileges()
    
    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.HOUSEHOLD, db, snap, id)
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

    baseStations(): One2ManyRelation
    {
        return this.hasMany(Models.BASE_STATION)
    }

    async onCreate(): Promise<void>
    {
        await super.onCreate()
        return this.GrandOneUserHouseholdAdminPrivileges.execute(this)
    }
}