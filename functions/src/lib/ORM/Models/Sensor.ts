import ModelImpl, { Models } from "./";

export default class Sensor extends ModelImpl {

    constructor(db: any)
    {
        super(Models.SENSOR, db)
    }
}