import ModelImpl from "../lib/ORM/Models";
import { N2OneRelation } from "../lib/ORM/Relation";
import { Stubs } from ".";

export class WindSheild extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Stubs.WIND_SHEILD, db, snap, id)
    }

    car(): N2OneRelation
    {
        return this.belongsTo(Stubs.CAR)
    }
}