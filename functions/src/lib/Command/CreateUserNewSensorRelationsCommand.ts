import { AbstractActionableFieldCommand } from ".";
import { asyncForEach } from "../util";
import Household from "../ORM/Models/Household";
import User from "../ORM/Models/User";

export default class CreateUserNewSensorRelationsCommand extends AbstractActionableFieldCommand {

    async execute(household: Household, sensorRelLinks: any): Promise<void>
    {
        const users = await household.users().get() as Array<User>
        const newSensorIds =  Object.keys(sensorRelLinks)

        await asyncForEach(users, async (user: User) => {
            const accepted = await user.household().getPivotField(User.f.HOUSEHOLDS.ACCEPTED)
            if(!accepted) return
            
            await user.sensors()
                .attachByIdBulk(newSensorIds, null, {
                    owner : {
                        id : user.getId()
                    }
                })
        })

        return
    }
}