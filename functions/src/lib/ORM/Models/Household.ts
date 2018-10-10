import ModelImpl, { Models } from "./";
import RelationImpl from "./../Relation";

export default class Household extends ModelImpl {

    constructor(db: any)
    {
        super(Models.HOUSEHOLD, db)
    }

    users(): RelationImpl
    {
        return this.belongsToMany(Models.USER)
    }
}