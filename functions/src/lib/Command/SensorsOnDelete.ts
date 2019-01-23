import { IModelCommand } from ".";
import Sensor from "../ORM/Models/Sensor";

export default class SensorsOnDelete implements IModelCommand
{
    async execute(sensor: Sensor): Promise<void> {
        await sensor.secure().delete()
        return
    }
    
    undo(owner: Sensor): Promise<void> {
        throw new Error("Method not implemented.");
    }
}