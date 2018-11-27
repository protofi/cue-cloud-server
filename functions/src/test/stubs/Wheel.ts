import ModelImpl from "../lib/ORM/Models";
import { N2OneRelation } from "../lib/ORM/Relation";

export default class Wheel extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super('wheels', db, snap, id)
    }

    car(): N2OneRelation
    {
        return this.belongsTo('cars')
    }
}