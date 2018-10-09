import ModelImpl, { Models } from "./";

export class Sensor extends ModelImpl {

    constructor(db: any)
    {
        super(Models.SENSOR, db)
    }
}