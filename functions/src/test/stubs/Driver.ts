import ModelImpl from "../lib/ORM/Models";
import { Many2ManyRelation } from "../lib/ORM/Relation";

export default class Driver extends ModelImpl {
    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super('drivers', db, snap, id)
    }

    cars(): Many2ManyRelation
    {
        return this.belongsToMany('cars')
    }
}