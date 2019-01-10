import ModelImpl, { Models } from "./";
import { N2OneRelation } from "../Relation";
import { UnlinkBaseStationFromHousehold } from "../../Command/UnlinkBaseStationFromHousehold";

export default class BaseStation extends ModelImpl {

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.BASE_STATION, db, snap, id)
    }

    household(): N2OneRelation
    {
        return this.belongsTo(Models.HOUSEHOLD)
            .defineActionableField(Models.HOUSEHOLD, new UnlinkBaseStationFromHousehold())
    }
}