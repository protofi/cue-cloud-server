import IActionableFieldCommand from "./Command";
import User from "./../ORM/Models/User";
import { asyncForEach } from "./../util";
import { Models } from "./../ORM/Models";

export default class CreateUserSensorRelationsCommand implements IActionableFieldCommand
{
    async execute(owner: User, accepted: string): Promise<void>
    {
        if(!accepted) return

        const household = await owner.household().get()
        if(!household) return

        const sensors: any = await household.getField(Models.SENSOR)
        if(!sensors) return

        const sensorIds = Object.keys(sensors)

        await asyncForEach(sensorIds,
            async (sensorId) => {
                await owner.sensors().attachById(sensorId)
            }
        )

        return
    }
    
    undo(): Promise<void>
    {
        throw new Error("Method not implemented.");
    }
}