import ModelImpl, { Models, RelationImpl } from "./";

export class Household extends ModelImpl {

    constructor(db: any)
    {
        super(Models.HOUSEHOLD, db)
    }

    users(): RelationImpl
    {
        return this.hasMany(Models.USER)
    }
}