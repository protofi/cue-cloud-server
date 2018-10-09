import ModelImpl, { Models, RelationModel } from "./";

export class Household extends ModelImpl {

    constructor(db: any)
    {
        super(Models.HOUSEHOLD, db)
    }

    users(): RelationModel
    {
        return this.hasMany(Models.USER)
    }
}