import ModelImpl, { Models, RelationModel } from "./";

export class Household extends ModelImpl {

    constructor(db: any)
    {
        super(Models.HOUSEHOLD, db)
    }

    users(): RelationModel
    {
        const users: ModelImpl = new ModelImpl(Models.USER, this.db)
        return this.belongsToMany(users)
    }
}