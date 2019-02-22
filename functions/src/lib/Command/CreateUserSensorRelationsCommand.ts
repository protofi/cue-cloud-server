import { AbstractActionableFieldCommand } from ".";
import User from "./../ORM/Models/User";
import { isEmpty } from "lodash"
import { Models } from "./../ORM/Models";

export default class CreateUserSensorRelationsCommand extends AbstractActionableFieldCommand
{
    async execute(user: User, value: string): Promise<void>
    {
        const accepted = JSON.parse(value)

        if(!accepted) return

        const household = await user.household().get()
        if(!household) return

        const sensors: any = await household.getField(Models.SENSOR)
        if(isEmpty(sensors)) return

        const sensorIds = Object.keys(sensors)

        await user.sensors().attachByIdBulk(sensorIds, null, {
            owner : {
                id : user.getId()
            }
        })

        return
    }
}