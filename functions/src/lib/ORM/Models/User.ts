import ModelImpl, { Models } from "./";
import RelationImpl from "./../Relation";

export default class User extends ModelImpl {

    constructor(db: any)
    {
        super(Models.USER, db)
    }

    households(): RelationImpl
    {
        return this.belongsToMany(Models.HOUSEHOLD)
    }
}