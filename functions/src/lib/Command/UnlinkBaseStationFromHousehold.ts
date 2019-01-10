import { IActionableFieldCommand } from ".";
import { asyncForEach } from "../util";
import Household from "../ORM/Models/Household";
import BaseStation from "../ORM/Models/BaseStation";

export class UnlinkBaseStationFromHousehold implements IActionableFieldCommand {

    async execute(baseStation: BaseStation, householdRelLinks: any): Promise<void>
    {
        return
        // return Promise.reject(householdRelLinks)
    }
    
    undo(household: Household): Promise<void> {
        throw new Error("Method not implemented.");
    }
}