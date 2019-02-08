import ModelImpl from "../lib/ORM/Models";
import { Many2OneRelation } from "../lib/ORM/Relation";
import { Stubs } from ".";

export default class Windshield extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Stubs.WIND_SHEILD, db, snap, id)
    }

    car(): Many2OneRelation
    {
        return this.haveOne(Stubs.CAR)
    }
}