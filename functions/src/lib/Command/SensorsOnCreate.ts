import { IModelCommand } from "../../lib/Command";
import Sensor from "../../lib/ORM/Models/Sensor";


export default class SensorsOnCreate implements IModelCommand
{
    async execute(owner: Sensor): Promise<void> {
        await owner.secure().create({})
        return
    }
    
    undo(owner: Sensor): Promise<void> {
        throw new Error("Method not implemented.");
    }

    
}