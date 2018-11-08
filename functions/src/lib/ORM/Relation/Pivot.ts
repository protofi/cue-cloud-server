import ModelImpl from "../Models";

export class Pivot {

    private db: FirebaseFirestore.Firestore
    private owner: ModelImpl
    private property: ModelImpl

    private model: ModelImpl

    constructor(db: FirebaseFirestore.Firestore, id: string, owner: ModelImpl, property: ModelImpl)
    {
        this.db = db
        this.owner = owner
        this.property = property

        const name = [owner.name, property.name].sort().join('_')

        this.model = new ModelImpl(name, db, null, id)
    }

    async getId(): Promise<string>
    {
        return this.model.getId()
    }
}