import ModelImpl from "../lib/ORM/Models";
import { Many2ManyRelation, N2OneRelation, One2ManyRelation } from "../lib/ORM/Relation";

export class Person extends ModelImpl {
    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super('persons', db, snap, id)
    }

    cars(): Many2ManyRelation
    {
        return this.belongsToMany('cars')
    }
}
export class Car extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super('cars', db, snap, id)
    }

    persons(): Many2ManyRelation
    {
        return this.belongsToMany('persons')
    }

    windShield(): N2OneRelation
    {
        return this.belongsTo('wind_sheild')
    }

    wheels(): One2ManyRelation
    {
        return this.hasMany('wheels')
    }
}

export class Wheel extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super('wheels', db, snap, id)
    }

    car(): N2OneRelation
    {
        return this.belongsTo('cars')
    }
}

export class WindSheild extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super('wind_sheild', db, snap, id)
    }

    car(): N2OneRelation
    {
        return this.belongsTo('cars')
    }
}