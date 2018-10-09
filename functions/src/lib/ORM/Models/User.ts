import ModelImpl, { Models, RelationModel } from "./";

export class User extends ModelImpl {

    constructor(db: any)
    {
        super(Models.USER, db)
    }

    households(): RelationModel
    {
        return this.hasMany(Models.HOUSEHOLD)
    }
}