import ModelImpl, { Models } from "./";
import { One2ManyRelation } from "./../Relation";

export default class Household extends ModelImpl {

    constructor(db: any, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Models.HOUSEHOLD, db, snap, id)
    }

    users(): One2ManyRelation
    {
        const rel = this.hasMany(Models.USER)
        
        return rel
    }
}