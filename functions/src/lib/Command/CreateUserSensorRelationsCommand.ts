import IActionableFieldCommand from "./Command";
import User from "./../ORM/Models/User";
import { Models } from "./../ORM/Models";

export default class CreateUserSensorRelationsCommand implements IActionableFieldCommand
{
    async execute(user: User, accepted: string): Promise<void>
    {
        if(!accepted) return

        const household = await user.household().get()
        if(!household) return

        const sensors: any = await household.getField(Models.SENSOR)
        if(!sensors) return

        const sensorIds = Object.keys(sensors)

        await user.sensors().attachByIdBulk(sensorIds, null, {
            owner : {
                id : user.getId()
            }
        })

        return
    }
    
    undo(): Promise<void>
    {
        throw new Error("Method not implemented.")
    }
}