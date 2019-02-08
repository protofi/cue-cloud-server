import ModelImpl, { Models } from "./";
import { Many2OneRelation } from "../Relation";
import { UnlinkBaseStationFromHousehold } from "../../Command/UnlinkBaseStationFromHousehold";

export default class BaseStation extends ModelImpl {

    static readonly f = {
        ID          : 'id',
        PIN         : 'pin',
        WEBSOCKET   : {
            _       : 'websocket',
            HOST    : 'hostname',
            PORT    : 'port'
        }
    }

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.BASE_STATION, db, snap, id)
    }

    household(): Many2OneRelation
    {
        return this.haveOne(Models.HOUSEHOLD)
            .defineActionableField(Models.HOUSEHOLD, new UnlinkBaseStationFromHousehold())
    }
}