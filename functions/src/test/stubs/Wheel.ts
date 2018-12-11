import ModelImpl from "../lib/ORM/Models";
import { N2OneRelation } from "../lib/ORM/Relation";
import { Stubs, ModelImportStrategyStub } from ".";

export default class Wheel extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super(Stubs.WHEEL, db, snap, id)
    }

    car(): N2OneRelation
    {
        return this.belongsTo(Stubs.CAR)
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
    importStrategy = new ModelImportStrategyStub('./Car')
}
