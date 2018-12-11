import ModelImpl from "../lib/ORM/Models";
import { Many2ManyRelation, N2OneRelation, One2ManyRelation } from "../lib/ORM/Relation";
import { Stubs, ModelImportStrategyStub } from ".";

export default class Car extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Stubs.CAR, db, snap, id)
    }

    drivers(): Many2ManyRelation
    {
        return this.belongsToMany(Stubs.DRIVER)
    }

    windShield(): N2OneRelation
    {
        return this.belongsTo(Stubs.WIND_SHEILD)
    }

    wheels(): One2ManyRelation
    {
        return this.hasMany(Stubs.WHEEL)
    }

    /**
     * Attach many models to many others
     */
    protected belongsToMany(property: string): Many2ManyRelation
    {
        if(!this.relations.has(property))
        {
            const relation: Many2ManyRelation = new Many2ManyRelationStub(this, property, this.db)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as Many2ManyRelation
    }

    /**
     * Attach one model to many others
     */
    protected hasMany(property: string): One2ManyRelation
    {
        if(!this.relations.has(property))
        {
            const relation: One2ManyRelation = new One2ManyRelationStub(this, property, this.db)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as One2ManyRelation
    }

    /**
     * Attach one or more models to one other
     */
    protected belongsTo(property: string): N2OneRelation
    {
        if(!this.relations.has(property))
        {
            const relation: N2OneRelation = new N2OneRelationStub(this, property, this.db)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as N2OneRelation
    }
}


class N2OneRelationStub extends N2OneRelation {
    importStrategy = new ModelImportStrategyStub('./WindShield')
}

class One2ManyRelationStub extends One2ManyRelation {
    importStrategy = new ModelImportStrategyStub('./Wheel')
}

class Many2ManyRelationStub extends Many2ManyRelation {
    importStrategy = new ModelImportStrategyStub('./Driver')
}