import ModelImpl, { Models } from "./";
import { One2OneRelation } from "../Relation";

export default class Sensor extends ModelImpl {

    constructor(db: any)
    {
        super(Models.SENSOR, db)
    }

    room(): One2OneRelation
    {
        return this.belongsTo(Models.ROOM)
    }
}