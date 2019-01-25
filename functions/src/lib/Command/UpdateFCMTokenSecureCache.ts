import { IActionableFieldCommand } from ".";
import User from "../ORM/Models/User";
import { asyncForEach } from "../util";
import ModelImpl, { Models } from "../ORM/Models";
import { includes, keys } from 'lodash'

export default class UpdateFCMTokenSecureCache implements IActionableFieldCommand {
    
    async execute(user: User, changes: any, after?: any, before?: any): Promise<void>
    {
        const tokens = await user.getField(User.f.FCM_TOKENS)
        
        const sensors = (await user.sensors().get()).filter(sensor => {
            return includes(keys(changes), sensor.getId())
        })

        await asyncForEach(sensors, async (sensor: ModelImpl) => {
            await sensor.secure().update({
                [Models.USER] : {
                    [user.getId()] : {
                        [User.f.FCM_TOKENS] : tokens
                    }
                }
            })
        })
    }
    
    undo(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}