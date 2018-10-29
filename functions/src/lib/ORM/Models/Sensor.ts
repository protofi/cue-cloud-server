import ModelImpl, { Models } from "./";
import { N2OneRelation, One2ManyRelation, Many2ManyRelation } from "../Relation";

export default class Sensor extends ModelImpl {

    constructor(db: any)
    {
        super(Models.SENSOR, db)
    }

    room(): N2OneRelation
    {
        return this.belongsTo(Models.ROOM)
    }

    events(): One2ManyRelation
    {
        return this.hasMany(Models.EVENT)
    }

    users(): Many2ManyRelation
    {
        return this.belongsToMany(Models.USER)
    }
}