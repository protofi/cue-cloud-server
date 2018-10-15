import ModelImpl, { Models } from "./";
import { N2OneRelation, One2ManyRelation } from "../Relation";

export default class Sensor extends ModelImpl {

    constructor(db: any)
    {
        super(Models.SENSOR, db)
    }

    room(): N2OneRelation
    {
        return this.belongsTo(Models.ROOM) as N2OneRelation
    }

    events(): One2ManyRelation
    {
        return this.hasMany(Models.EVENT) as One2ManyRelation
    }
}