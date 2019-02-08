import ModelImpl from "../lib/ORM/Models";
import { Many2OneRelation } from "../lib/ORM/Relation";
import { Stubs, ModelImportStrategyStub } from ".";

export default class Wheel extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Stubs.WHEEL, db, snap, id)
    }

    car(): Many2OneRelation
    {
        return this.haveOne(Stubs.CAR)
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
    importStrategy = new ModelImportStrategyStub('./Car')
}
