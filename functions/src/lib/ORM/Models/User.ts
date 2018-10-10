import ModelImpl, { Models, RelationImpl } from "./";

export class User extends ModelImpl {

    constructor(db: any)
    {
        super(Models.USER, db)
    }

    households(): RelationImpl
    {
        return this.hasMany(Models.HOUSEHOLD)
    }
}