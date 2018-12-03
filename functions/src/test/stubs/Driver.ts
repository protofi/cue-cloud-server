import ModelImpl from "../lib/ORM/Models";
import { Many2ManyRelation } from "../lib/ORM/Relation";
import { Stubs } from ".";

export default class Driver extends ModelImpl {
    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Stubs.DRIVER, db, snap, id)
    }

    cars(): Many2ManyRelation
    {
        return this.belongsToMany(Stubs.CAR)
    }
}