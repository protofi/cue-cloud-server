import ModelImpl from "../lib/ORM/Models";
import { Many2ManyRelation, Many2OneRelation } from "../lib/ORM/Relation";
import { Stubs, ModelImportStrategyStub } from ".";

export default class Driver extends ModelImpl {
    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Stubs.DRIVER, db, snap, id)
    }

    cars(): Many2ManyRelation
    {
        return this.haveMany(Stubs.CAR)
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
}

class Many2ManyRelationStub extends Many2ManyRelation {
    importStrategy = new ModelImportStrategyStub('./Car')
}