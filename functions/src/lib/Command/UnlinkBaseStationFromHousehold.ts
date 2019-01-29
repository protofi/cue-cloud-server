import { AbstractActionableFieldCommand } from ".";
import BaseStation from "../ORM/Models/BaseStation";

export class UnlinkBaseStationFromHousehold extends AbstractActionableFieldCommand {

    async execute(baseStation: BaseStation, householdRelLinks: any): Promise<void>
    {
        return
        // return Promise.reject(householdRelLinks)
    }
}