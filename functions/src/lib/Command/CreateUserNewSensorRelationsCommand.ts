import { IActionableFieldCommand } from ".";
import { asyncForEach } from "../util";
import Household from "../ORM/Models/Household";
import User from "../ORM/Models/User";

export class CreateUserNewSensorRelationsCommand implements IActionableFieldCommand {

    async execute(household: Household, sensorRelLinks: any): Promise<void>
    {
        const users = await household.users().get() as Array<User>
        const newSensorIds =  Object.keys(sensorRelLinks)

        await asyncForEach(users, async (user: User) => {
            const accepted = await user.household().getPivotField('accepted')
            if(accepted) await user.sensors().attachByIdBulk(newSensorIds)
        })

        return
    }
    
    undo(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}