import ModelImpl from "../lib/ORM/Models";
import { N2OneRelation } from "../lib/ORM/Relation";
import { Stubs } from ".";

export default class Wheel extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Stubs.WHEEL, db, snap, id)
    }

    car(): N2OneRelation
    {
        return this.belongsTo(Stubs.CAR)
    }
}