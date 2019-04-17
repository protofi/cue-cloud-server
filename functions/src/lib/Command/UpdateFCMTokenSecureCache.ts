import { AbstractActionableFieldCommand } from ".";
import User from "../ORM/Models/User";
import { asyncForEach } from "../util";
import ModelImpl, { Models } from "../ORM/Models";
import { includes, keys } from 'lodash'

export default class UpdateFCMTokenSecureCache extends AbstractActionableFieldCommand {
    
    async execute(user: User, changes: any, after?: any, before?: any): Promise<void>
    {
        const tokens = await user.getField(User.f.FCM_TOKENS._)
        
        const sensors = (await user.sensors().get()).filter(sensor => {
            return includes(keys(changes), sensor.getId())
        })

        await asyncForEach(sensors, async (sensor: ModelImpl) => {
            await sensor.secure().updateOrCreate({
                [Models.USER] : {
                    [user.getId()] : {
                        [User.f.FCM_TOKENS._] : tokens
                    }
                }
            })
        })
    }
}