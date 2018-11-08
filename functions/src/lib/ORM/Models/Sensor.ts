import ModelImpl, { Models } from "./";
import { N2OneRelation, One2ManyRelation, Many2ManyRelation } from "../Relation";

export default class Sensor extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore)
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
        const rel = this.belongsToMany(Models.USER)

        // rel.defineCachableFields([
        //     'pivot.muted'
        // ])

        return rel
    }
}