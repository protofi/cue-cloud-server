import ModelImpl from "../lib/ORM/Models";
import { Many2ManyRelation, Many2OneRelation, One2ManyRelation } from "../lib/ORM/Relation";
import { Stubs, ModelImportStrategyStub } from ".";

export default class Car extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Stubs.CAR, db, snap, id)
    }

    drivers(): Many2ManyRelation
    {
        return this.haveMany(Stubs.DRIVER)
    }

    windshield(): Many2OneRelation
    {
        return this.haveOne(Stubs.WIND_SHEILD)
    }

    wheels(): One2ManyRelation
    {
        return this.hasMany(Stubs.WHEEL)
    }

    /**
     * Attach many models to many others
     */
    protected haveMany(property: string): Many2ManyRelation
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
    protected hasMany(property: string, isWeak?: boolean): One2ManyRelation
    {
        if(!this.relations.has(property))
        {
            const relation: One2ManyRelation = new One2ManyRelationStub(this, property, this.db, isWeak)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as One2ManyRelation
    }

    /**
     * Attach one or more models to one other
      */
    protected haveOne(property: string): Many2OneRelation
    {
        if(!this.relations.has(property))
        {
            const relation: Many2OneRelation = new N2OneRelationStub(this, property, this.db)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as Many2OneRelation
    }
}

class N2OneRelationStub extends Many2OneRelation {
    importStrategy = new ModelImportStrategyStub('./WindShield')
}

class One2ManyRelationStub extends One2ManyRelation {
    importStrategy = new ModelImportStrategyStub('./Wheel')
}

class Many2ManyRelationStub extends Many2ManyRelation {
    importStrategy = new ModelImportStrategyStub('./Driver')
}