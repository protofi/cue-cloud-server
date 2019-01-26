import { AbstractActionableFieldCommand } from ".";
import User from "./../ORM/Models/User";
import { Models } from "./../ORM/Models";

export default class CreateUserSensorRelationsCommand extends AbstractActionableFieldCommand
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
}