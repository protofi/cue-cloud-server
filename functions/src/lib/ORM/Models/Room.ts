import ModelImpl, { Models } from "./";

export default class Room extends ModelImpl {

    constructor(db: any)
    {
        super(Models.SENSOR, db)
    }
}