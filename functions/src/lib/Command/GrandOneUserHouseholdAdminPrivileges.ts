import { IModelCommand } from ".";
import Household from "../ORM/Models/Household";
import User from "../ORM/Models/User";
import { first } from 'lodash'
import { Errors, Roles } from "../const";

/**
 * When executed the first user of the list of related users on the particular household will be granded ADMIN privileges
 */
export class GrandOneUserHouseholdAdminPrivileges implements IModelCommand {

    async execute(household: Household): Promise<void>
    {
        const householdUsers: Array<User>   = await household.users().get() as Array<User>
        const adminToCome: User             = first(householdUsers)
        const adminToComeHousehold          = await adminToCome.household().get()

        if(!adminToComeHousehold)
            throw Error(Errors.NOT_RELATED)

        if(adminToComeHousehold.getId() !== household.getId())
            throw Error(Errors.UNAUTHORIZED)

        await adminToCome.household().updatePivot({
                role : Roles.ADMIN,
                accepted : true
            })
    }
    
    undo(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}