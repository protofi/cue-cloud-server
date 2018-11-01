import ModelImpl from "../lib/ORM/Models";
import { Many2ManyRelation, N2OneRelation, One2ManyRelation } from "../lib/ORM/Relation";

export class Person extends ModelImpl {
    constructor(_db: any)
    {
        super('persons', _db)
    }

    cars(): Many2ManyRelation
    {
        return this.belongsToMany('cars')
    }
}
export class Car extends ModelImpl {

    constructor(_db: any)
    {
        super('cars', _db)
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

    constructor(_db: any)
    {
        super('wheels', _db)
    }

    car(): N2OneRelation
    {
        return this.belongsTo('cars')
    }
}

export class WindSheild extends ModelImpl {

    constructor(_db: any)
    {
        super('wind_sheild', _db)
    }

    car(): N2OneRelation
    {
        return this.belongsTo('cars')
    }
}